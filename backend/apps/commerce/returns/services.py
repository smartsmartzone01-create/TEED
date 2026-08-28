from decimal import Decimal

from django.db import transaction
from django.db.models import F, Max
from rest_framework.exceptions import ValidationError

from apps.workspaces.policy import WorkspacePermission

from ..catalog.models import Product
from ..inventory.models import StockBatch, TrackedUnit
from ..quantity_rules import require_valid_quantity
from ..sales.models import SaleItem
from ..services import (
    commerce_membership,
    record_return as legacy_record_return,
    refresh_decisions,
)
from .models import ReturnReplacement, ReturnReplacementAllocation, SaleReturn


def _effective_batch_unit_cost(batch):
    return (batch.unit_cost or Decimal("0")) + (
        batch.additional_cost / batch.quantity_received
    )


def _return_number(*, business):
    sequence = (
        SaleReturn.objects.filter(sale__business=business).aggregate(
            value=Max("return_sequence")
        )["value"]
        or 0
    ) + 1
    handle = (
        "".join(
            character
            for character in business.public_handle.upper()
            if character.isalnum()
        )[:8]
        or "TEED"
    )
    return sequence, f"{handle}-RET-{sequence:07d}"


def _allocate_quantity_replacement(*, replacement, product, quantity):
    remaining = quantity
    cost_total = Decimal("0")
    batches = (
        StockBatch.objects.select_for_update()
        .filter(
            product=product,
            tracking_mode=Product.TrackingMode.QUANTITY,
            quantity_remaining__gt=0,
        )
        .order_by("received_at", "created_at")
    )
    for batch in batches:
        allocated = min(remaining, batch.quantity_remaining)
        if allocated <= 0:
            continue
        unit_cost = _effective_batch_unit_cost(batch)
        ReturnReplacementAllocation.objects.create(
            replacement=replacement,
            batch=batch,
            quantity=allocated,
            unit_cost=unit_cost,
        )
        batch.quantity_remaining = F("quantity_remaining") - allocated
        batch.save(update_fields=["quantity_remaining", "updated_at"])
        cost_total += allocated * unit_cost
        remaining -= allocated
        if remaining == 0:
            break
    if remaining > 0:
        raise ValidationError(
            {"replacement": [f"Insufficient stock for replacement {product.name}."]}
        )
    return cost_total


def _allocate_tracked_replacement(*, replacement, product, tracked_unit_id, quantity):
    if quantity != Decimal("1"):
        raise ValidationError(
            {"replacement": ["An individually tracked replacement must be one unit."]}
        )
    unit = (
        TrackedUnit.objects.select_for_update()
        .filter(
            id=tracked_unit_id,
            product=product,
            status=TrackedUnit.Status.AVAILABLE,
        )
        .first()
    )
    if unit is None:
        raise ValidationError(
            {"replacement": [f"The selected {product.name} unit is unavailable."]}
        )
    batch = StockBatch.objects.select_for_update().get(pk=unit.stock_line_id)
    if batch.quantity_remaining < 1:
        raise ValidationError(
            {"replacement": [f"The selected {product.name} batch is unavailable."]}
        )
    unit_cost = _effective_batch_unit_cost(batch)
    ReturnReplacementAllocation.objects.create(
        replacement=replacement,
        batch=batch,
        quantity=Decimal("1"),
        unit_cost=unit_cost,
    )
    batch.quantity_remaining = F("quantity_remaining") - 1
    batch.save(update_fields=["quantity_remaining", "updated_at"])
    unit.status = TrackedUnit.Status.SOLD
    unit.save(update_fields=["status", "updated_at"])
    replacement.tracked_unit = unit
    return unit_cost


def _record_replacement(*, business, return_record, replacement_values):
    source = replacement_values["source"]
    quantity = replacement_values["quantity"]

    if source == ReturnReplacement.Source.INDEPENDENT:
        details = replacement_values.get("item_details", {})
        if details.get("identifier_value") and quantity != Decimal("1"):
            raise ValidationError(
                {
                    "replacement": [
                        "An independently sourced item with a serial, IMEI, or other "
                        "unique identifier must be recorded as one unit."
                    ]
                }
            )
        unit_cost = replacement_values["acquisition_unit_cost"]
        cost_total = quantity * unit_cost
        return ReturnReplacement.objects.create(
            return_record=return_record,
            source=source,
            acquisition_source=replacement_values["acquisition_source"].strip(),
            item_name=replacement_values["item_name"].strip(),
            item_details=details,
            quantity=quantity,
            acquisition_unit_cost=unit_cost,
            cost_total=cost_total,
        )

    product = (
        Product.objects.select_for_update()
        .filter(
            id=replacement_values["product_id"],
            business=business,
            is_active=True,
        )
        .first()
    )
    if product is None:
        raise ValidationError({"replacement": ["Choose an available replacement SKU."]})

    require_valid_quantity(
        quantity=quantity,
        unit=product.unit,
        field="replacement",
    )

    tracked_unit_id = replacement_values.get("tracked_unit_id")
    if product.tracking_mode == Product.TrackingMode.INDIVIDUAL and not tracked_unit_id:
        raise ValidationError(
            {"replacement": [f"Choose the exact {product.name} unit to replace."]}
        )
    if product.tracking_mode == Product.TrackingMode.QUANTITY and tracked_unit_id:
        raise ValidationError(
            {"replacement": [f"{product.name} is quantity-tracked; do not choose a unit."]}
        )

    replacement = ReturnReplacement.objects.create(
        return_record=return_record,
        source=source,
        product=product,
        item_name=product.name,
        quantity=quantity,
    )
    if tracked_unit_id:
        cost_total = _allocate_tracked_replacement(
            replacement=replacement,
            product=product,
            tracked_unit_id=tracked_unit_id,
            quantity=quantity,
        )
    else:
        cost_total = _allocate_quantity_replacement(
            replacement=replacement,
            product=product,
            quantity=quantity,
        )

    product.current_quantity = F("current_quantity") - quantity
    product.save(update_fields=["current_quantity", "updated_at"])
    replacement.cost_total = cost_total
    replacement.save(update_fields=["tracked_unit", "cost_total", "updated_at"])
    return replacement


@transaction.atomic
def record_return(
    *,
    actor,
    business_id,
    sale_id,
    items,
    resolution,
    reason,
    returned_at,
    refund_amount=None,
    replacement=None,
):
    if resolution == SaleReturn.Resolution.REFUND and refund_amount is None:
        raise ValidationError(
            {"refund_amount": ["Enter the amount actually refunded to the customer."]}
        )
    if resolution != SaleReturn.Resolution.REFUND and refund_amount is not None:
        raise ValidationError(
            {"refund_amount": ["Only refund returns can include a refund amount."]}
        )

    membership = commerce_membership(
        user=actor,
        business_id=business_id,
        permission=WorkspacePermission.RECORD_SALES,
    )
    membership.business.__class__.objects.select_for_update().get(
        pk=membership.business_id
    )

    sale_items = {
        str(item.id): item
        for item in SaleItem.objects.select_for_update()
        .select_related("product")
        .filter(
            sale_id=sale_id,
            id__in=[item["sale_item_id"] for item in items],
        )
    }

    for item in items:
        sale_item = sale_items.get(str(item["sale_item_id"]))
        if sale_item is None:
            continue
        if sale_item.product_id is not None:
            require_valid_quantity(
                quantity=item["quantity"],
                unit=sale_item.product.unit,
                field="items",
            )
        if item["condition"] == "sellable" and sale_item.product_id is None:
            raise ValidationError(
                {
                    "items": [
                        "An independent sale item cannot be restored to stock "
                        "automatically. Record it as damaged/non-sellable here and "
                        "receive it into stock separately if the business keeps it."
                    ]
                }
            )
        if sale_item.tracked_unit_id is not None:
            remaining = sale_item.quantity - sale_item.returned_quantity
            if item["quantity"] != remaining:
                raise ValidationError(
                    {
                        "items": [
                            "An individually tracked item must be returned as the "
                            "whole remaining unit."
                        ]
                    }
                )

    sequence, return_number = _return_number(business=membership.business)
    record = legacy_record_return(
        actor=actor,
        business_id=business_id,
        sale_id=sale_id,
        items=items,
        resolution=resolution,
        reason=reason,
        returned_at=returned_at,
        return_sequence=sequence,
        return_number=return_number,
    )

    for item in items:
        sale_item = sale_items.get(str(item["sale_item_id"]))
        if sale_item is None or sale_item.tracked_unit_id is None:
            continue
        tracked_unit = TrackedUnit.objects.select_for_update().get(
            pk=sale_item.tracked_unit_id
        )
        tracked_unit.status = (
            TrackedUnit.Status.AVAILABLE
            if item["condition"] == "sellable"
            else TrackedUnit.Status.DAMAGED
        )
        tracked_unit.save(update_fields=["status", "updated_at"])

    returned_items = list(record.items.all())
    recovered_inventory_cost = sum(
        (item.cost_total for item in returned_items if item.condition == "sellable"),
        Decimal("0"),
    )
    damaged_loss = sum(
        (item.cost_total for item in returned_items if item.condition == "damaged"),
        Decimal("0"),
    )

    actual_refund_amount = Decimal("0")
    if resolution == SaleReturn.Resolution.REFUND:
        actual_refund_amount = refund_amount
        if actual_refund_amount > record.total:
            raise ValidationError(
                {
                    "refund_amount": [
                        "The refund cannot exceed the value of the returned items."
                    ]
                }
            )

    credit_amount = (
        record.total if resolution == SaleReturn.Resolution.CREDIT else Decimal("0")
    )
    replacement_record = None
    if resolution == SaleReturn.Resolution.REPLACEMENT:
        if not replacement:
            raise ValidationError(
                {"replacement": ["Describe the replacement given to the customer."]}
            )
        replacement_record = _record_replacement(
            business=membership.business,
            return_record=record,
            replacement_values=replacement,
        )

    record.refund_amount = actual_refund_amount
    record.credit_amount = credit_amount
    record.recovered_inventory_cost = recovered_inventory_cost
    record.damaged_loss = damaged_loss
    record.replacement_cost = (
        replacement_record.cost_total if replacement_record else Decimal("0")
    )
    record.save(
        update_fields=[
            "refund_amount",
            "credit_amount",
            "recovered_inventory_cost",
            "damaged_loss",
            "replacement_cost",
            "updated_at",
        ]
    )
    refresh_decisions(business=membership.business)
    return record


__all__ = ["record_return"]
