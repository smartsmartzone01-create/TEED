from decimal import Decimal

from django.db import transaction
from django.db.models import F
from django.utils import timezone
from rest_framework.exceptions import ValidationError

from apps.workspaces.policy import WorkspacePermission

from ..models import (
    InventoryMovement,
    Product,
    Sale,
    SaleItem,
    StockBatch,
    StockContainer,
    StockGroup,
    StockReceipt,
    StockReceiptAudit,
)
from ..services import _sync_stock_expense, commerce_membership, refresh_decisions
from .stock import _assert_receipt_editable, _require_whole_quantity


def _recalculate_sale_costs(batch):
    sale_item_ids = set()
    sale_ids = set()
    effective_cost = (batch.unit_cost or Decimal("0")) + (
        batch.additional_cost / batch.quantity_received
        if batch.quantity_received
        else Decimal("0")
    )
    for allocation in batch.sale_allocations.select_related("sale_item__sale").all():
        allocation.unit_cost = effective_cost
        allocation.save(update_fields=["unit_cost", "updated_at"])
        sale_item_ids.add(allocation.sale_item_id)
        sale_ids.add(allocation.sale_item.sale_id)

    for item in SaleItem.objects.filter(id__in=sale_item_ids).prefetch_related("allocations"):
        item.cost_total = sum(
            (
                allocation.quantity * allocation.unit_cost
                for allocation in item.allocations.all()
            ),
            Decimal("0"),
        )
        item.save(update_fields=["cost_total", "updated_at"])

    for sale in Sale.objects.filter(id__in=sale_ids).prefetch_related("items"):
        sale.cost_of_goods = sum(
            (item.cost_total for item in sale.items.all()), Decimal("0")
        )
        sale.save(update_fields=["cost_of_goods", "updated_at"])


def _recalculate_group_quantity(group):
    quantity = sum(
        (
            line.quantity_received / (line.conversion_to_base or Decimal("1"))
            for line in group.type_lines.all()
        ),
        Decimal("0"),
    )
    group.quantity = quantity
    group.save(update_fields=["quantity", "updated_at"])


@transaction.atomic
def correct_stock_structure(
    *,
    actor,
    business_id,
    receipt_id,
    batches=None,
    groups=None,
    lines=None,
    **values,
):
    membership = commerce_membership(
        user=actor,
        business_id=business_id,
        permission=WorkspacePermission.MANAGE_INVENTORY,
    )
    receipt = (
        StockReceipt.objects.select_for_update()
        .filter(id=receipt_id, business=membership.business)
        .first()
    )
    if receipt is None:
        raise ValidationError({"receipt": ["Stock receipt not found."]})
    _assert_receipt_editable(receipt)

    before = {
        "supplier_name": receipt.supplier_name,
        "additional_cost": str(receipt.additional_cost),
        "batches": [],
        "groups": [],
        "lines": [],
    }

    allowed_receipt_values = {
        key: value
        for key, value in values.items()
        if key in {"supplier_name", "additional_cost"}
    }
    for field, value in allowed_receipt_values.items():
        setattr(receipt, field, value)
    if allowed_receipt_values:
        receipt.save(update_fields=[*allowed_receipt_values.keys(), "updated_at"])

    for correction in batches or []:
        batch = StockContainer.objects.select_for_update().filter(
            id=correction["id"], receipt=receipt
        ).first()
        if batch is None:
            raise ValidationError({"batches": ["Select a batch from this stock."]})
        before["batches"].append({"id": str(batch.id), "name": batch.name})
        batch.name = correction["name"].strip()
        batch.save(update_fields=["name", "updated_at"])

    for correction in groups or []:
        group = StockGroup.objects.select_for_update().filter(
            id=correction["id"], batch__receipt=receipt
        ).first()
        if group is None:
            raise ValidationError({"groups": ["Select a group from this stock."]})
        before["groups"].append({"id": str(group.id), "name": group.name})
        group.name = correction["name"].strip()
        group.save(update_fields=["name", "updated_at"])

    touched_groups = set()
    for correction in lines or []:
        line = (
            StockBatch.objects.select_for_update()
            .select_related("product", "stock_group")
            .filter(id=correction["id"], receipt=receipt)
            .first()
        )
        if line is None:
            raise ValidationError({"lines": ["Select a product from this stock."]})

        product = Product.objects.select_for_update().get(pk=line.product_id)
        old_received = line.quantity_received
        old_remaining = line.quantity_remaining
        old_unit = line.received_unit or product.unit
        consumed = max(Decimal("0"), old_received - old_remaining)
        before["lines"].append(
            {
                "id": str(line.id),
                "product": product.name,
                "quantity_received": str(old_received),
                "unit": old_unit,
                "unit_cost": str(line.unit_cost) if line.unit_cost is not None else None,
            }
        )

        product_fields = []
        for field in ["name", "brand", "variant", "barcode"]:
            if field in correction:
                setattr(product, field, correction[field])
                product_fields.append(field)

        new_unit = correction.get("unit", old_unit).strip()
        if new_unit.casefold() != old_unit.casefold():
            if line.stock_group_id and line.stock_group.type_lines.exclude(pk=line.pk).exists():
                raise ValidationError(
                    {"lines": [f"{product.name}: change the unit from the whole group, not one product."]}
                )
            if consumed > 0 or line.movements.exclude(kind=InventoryMovement.Kind.RECEIPT).exists():
                raise ValidationError(
                    {"lines": [f"{product.name}: the unit cannot change after dependent stock activity."]}
                )
            if product.stock_batches.exclude(pk=line.pk).exists():
                raise ValidationError(
                    {"lines": [f"{product.name}: this unit is already used by other stock receipts."]}
                )
            if line.conversion_to_base != Decimal("1"):
                raise ValidationError(
                    {"lines": [f"{product.name}: converted units require a governed inventory correction."]}
                )
            line.received_unit = new_unit
            product.unit = new_unit
            product_fields.append("unit")
            if line.stock_group_id:
                line.stock_group.unit = new_unit
                line.stock_group.save(update_fields=["unit", "updated_at"])

        if product_fields:
            product.save(update_fields=[*set(product_fields), "updated_at"])

        quantity = correction.get("quantity")
        if quantity is not None:
            _require_whole_quantity(quantity=quantity, unit=new_unit, field="lines")
            new_received = quantity * line.conversion_to_base
            if line.tracking_mode == Product.TrackingMode.INDIVIDUAL:
                tracked_count = line.tracked_units.count()
                if new_received != new_received.to_integral_value() or tracked_count != int(new_received):
                    raise ValidationError(
                        {"lines": [f"{product.name}: quantity must match the {tracked_count} saved individual records."]}
                    )
            if new_received < consumed:
                raise ValidationError(
                    {"lines": [f"{product.name}: quantity cannot be reduced below {consumed} already consumed."]}
                )

            delta = new_received - old_received
            line.quantity_received = new_received
            if receipt.status == StockReceipt.Status.RECEIVED:
                line.quantity_remaining = old_remaining + delta
                if line.quantity_remaining < 0:
                    raise ValidationError(
                        {"lines": [f"{product.name}: this correction would create negative stock."]}
                    )
                if delta:
                    Product.objects.filter(pk=product.pk).update(
                        current_quantity=F("current_quantity") + delta
                    )
                    InventoryMovement.objects.create(
                        business=membership.business,
                        product=product,
                        batch=line,
                        kind=InventoryMovement.Kind.CORRECTION,
                        quantity_delta=delta,
                        occurred_at=timezone.now(),
                        reason=f"Correction to {receipt.reference} within the stock correction window.",
                        recorded_by=actor,
                    )
            else:
                line.quantity_remaining = Decimal("0")

        if "unit_cost" in correction:
            received_unit_cost = correction["unit_cost"]
            line.unit_cost = (
                received_unit_cost / line.conversion_to_base
                if received_unit_cost is not None
                else None
            )

        line.save()
        if "unit_cost" in correction and line.sale_allocations.exists():
            _recalculate_sale_costs(line)
        if line.stock_group_id:
            touched_groups.add(line.stock_group_id)

    for group_id in touched_groups:
        group = StockGroup.objects.prefetch_related("type_lines").get(pk=group_id)
        _recalculate_group_quantity(group)

    if receipt.status == StockReceipt.Status.RECEIVED:
        _sync_stock_expense(receipt=receipt, actor=actor)

    after = {
        "supplier_name": receipt.supplier_name,
        "additional_cost": str(receipt.additional_cost),
        "batches": [
            {"id": str(batch.id), "name": batch.name} for batch in receipt.batches.all()
        ],
        "groups": [
            {"id": str(group.id), "name": group.name}
            for group in StockGroup.objects.filter(batch__receipt=receipt)
        ],
        "lines": [
            {
                "id": str(line.id),
                "product": line.product.name,
                "quantity_received": str(line.quantity_received),
                "unit": line.received_unit or line.product.unit,
                "unit_cost": str(line.unit_cost) if line.unit_cost is not None else None,
            }
            for line in receipt.lines.select_related("product").all()
        ],
    }
    if allowed_receipt_values or batches or groups or lines:
        StockReceiptAudit.objects.create(
            receipt=receipt,
            actor=actor,
            action="edit_details",
            before=before,
            after=after,
        )
    refresh_decisions(business=membership.business)
    return receipt
