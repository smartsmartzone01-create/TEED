from decimal import Decimal
from zoneinfo import ZoneInfo

from django.conf import settings
from django.db import transaction
from django.db.models import F, Max
from django.utils import timezone
from rest_framework.exceptions import PermissionDenied, ValidationError

from apps.workspaces.business.models import BusinessSettings
from apps.workspaces.policy import WorkspacePermission, role_has_permission

from ..catalog.models import Product
from ..inventory.models import InventoryMovement, StockBatch, TrackedUnit
from ..services import commerce_membership, create_stock_receipt, refresh_decisions
from .models import Sale, SaleAllocation, SaleAudit, SaleItem, TradeInDetail


def _effective_batch_unit_cost(batch):
    return (batch.unit_cost or Decimal("0")) + (
        batch.additional_cost / batch.quantity_received
    )


def _create_sale_movement(*, product, batch, sale, quantity, actor):
    InventoryMovement.objects.create(
        business=product.business,
        product=product,
        batch=batch,
        sale=sale,
        kind=InventoryMovement.Kind.SALE,
        quantity_delta=-quantity,
        reason=f"Allocated to receipt {sale.receipt_number}.",
        occurred_at=sale.sold_at,
        recorded_by=actor,
    )


def _allocate_fifo(*, product, sale_item, quantity, actor, sale):
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
        effective_unit_cost = _effective_batch_unit_cost(batch)
        SaleAllocation.objects.create(
            sale_item=sale_item,
            batch=batch,
            quantity=allocated,
            unit_cost=effective_unit_cost,
        )
        batch.quantity_remaining = F("quantity_remaining") - allocated
        batch.save(update_fields=["quantity_remaining", "updated_at"])
        cost_total += allocated * effective_unit_cost
        _create_sale_movement(
            product=product,
            batch=batch,
            sale=sale,
            quantity=allocated,
            actor=actor,
        )
        remaining -= allocated
        if remaining == 0:
            break
    if remaining > 0:
        raise ValidationError(
            {"items": [f"Insufficient quantity-tracked stock for {product.name}."]}
        )
    return cost_total


def _allocate_tracked_unit(*, product, sale_item, tracked_unit_id, actor, sale):
    unit = (
        TrackedUnit.objects.select_for_update()
        .select_related("stock_line")
        .filter(
            id=tracked_unit_id,
            product=product,
            product__business=product.business,
            status=TrackedUnit.Status.AVAILABLE,
            stock_line__tracking_mode=Product.TrackingMode.INDIVIDUAL,
        )
        .first()
    )
    if unit is None:
        raise ValidationError(
            {"items": [f"The selected {product.name} item is no longer available."]}
        )
    batch = StockBatch.objects.select_for_update().get(pk=unit.stock_line_id)
    if batch.quantity_remaining < 1:
        raise ValidationError(
            {"items": [f"The selected {product.name} stock batch is unavailable."]}
        )
    effective_unit_cost = _effective_batch_unit_cost(batch)
    SaleAllocation.objects.create(
        sale_item=sale_item,
        batch=batch,
        quantity=Decimal("1"),
        unit_cost=effective_unit_cost,
    )
    batch.quantity_remaining = F("quantity_remaining") - 1
    batch.save(update_fields=["quantity_remaining", "updated_at"])
    unit.status = TrackedUnit.Status.SOLD
    unit.save(update_fields=["status", "updated_at"])
    _create_sale_movement(
        product=product,
        batch=batch,
        sale=sale,
        quantity=Decimal("1"),
        actor=actor,
    )
    return effective_unit_cost


def _record_items(*, sale, actor, business, items):
    subtotal = Decimal("0")
    total_cost = Decimal("0")
    for item in items:
        if item["source"] == SaleItem.Source.MANUAL:
            quantity = item["quantity"]
            unit_price = item["unit_price"]
            acquisition_unit_cost = item.get("acquisition_unit_cost")
            line_total = quantity * unit_price
            cost_total = (
                quantity * acquisition_unit_cost
                if acquisition_unit_cost is not None
                else Decimal("0")
            )
            SaleItem.objects.create(
                sale=sale,
                source=SaleItem.Source.MANUAL,
                item_name=item["item_name"].strip(),
                item_details=item.get("item_details", {}),
                acquisition_unit_cost=acquisition_unit_cost,
                quantity=quantity,
                unit_price=unit_price,
                line_total=line_total,
                cost_total=cost_total,
            )
            subtotal += line_total
            total_cost += cost_total
            continue

        product = (
            Product.objects.select_for_update()
            .filter(id=item["product_id"], business=business, is_active=True)
            .first()
        )
        if product is None:
            raise ValidationError({"items": ["A selected product is unavailable."]})
        quantity = item["quantity"]
        tracked_unit_id = item.get("tracked_unit_id")
        if tracked_unit_id and quantity != 1:
            raise ValidationError(
                {"items": [f"Record the selected {product.name} item as one unit."]}
            )
        unit_price = item.get("unit_price")
        if unit_price is None:
            if product.selling_price is None:
                raise ValidationError(
                    {"items": [f"Enter a selling price for {product.name}."]}
                )
            unit_price = product.selling_price
        line_total = quantity * unit_price
        sale_item = SaleItem.objects.create(
            sale=sale,
            source=SaleItem.Source.CATALOG,
            product=product,
            tracked_unit_id=tracked_unit_id,
            item_name=product.name,
            quantity=quantity,
            unit_price=unit_price,
            line_total=line_total,
        )
        if tracked_unit_id:
            cost = _allocate_tracked_unit(
                product=product,
                sale_item=sale_item,
                tracked_unit_id=tracked_unit_id,
                actor=actor,
                sale=sale,
            )
        else:
            cost = _allocate_fifo(
                product=product,
                sale_item=sale_item,
                quantity=quantity,
                actor=actor,
                sale=sale,
            )
        sale_item.cost_total = cost
        sale_item.save(update_fields=["cost_total", "updated_at"])
        product.current_quantity = F("current_quantity") - quantity
        product.save(update_fields=["current_quantity", "updated_at"])
        subtotal += line_total
        total_cost += cost
    return subtotal, total_cost


def _record_trade_in(*, sale, actor, business_id, trade_in):
    if not trade_in:
        return None
    details = dict(trade_in.get("incoming_item_details", {}))
    stock_product_id = trade_in.get("stock_product_id")
    stock_receipt = None
    stock_product = None
    if stock_product_id:
        stock_product = Product.objects.filter(
            id=stock_product_id, business_id=business_id, is_active=True
        ).first()
        if stock_product is None:
            raise ValidationError(
                {
                    "trade_in": [
                        "Choose an active SKU from this business for the received item."
                    ]
                }
            )

    if trade_in.get("add_to_stock"):
        unit = details.get("unit", "piece") or "piece"
        identifier_kind = details.get("identifier_kind", "")
        identifier_value = details.get("identifier_value", "")
        tracking_mode = (
            Product.TrackingMode.INDIVIDUAL
            if identifier_value
            else Product.TrackingMode.QUANTITY
        )
        tracked_units = []
        if tracking_mode == Product.TrackingMode.INDIVIDUAL:
            tracked_units = [
                {
                    "model_name": details.get("model", ""),
                    "brand": details.get("brand", ""),
                    "color": details.get("color", ""),
                    "capacity": details.get("capacity", ""),
                    "condition": details.get("condition", ""),
                    "identifiers": [
                        {"kind": identifier_kind, "value": identifier_value}
                    ]
                    if identifier_kind and identifier_value
                    else [],
                }
            ]
        catalog_item = (
            {"key": "trade-in-item", "product_id": stock_product.id}
            if stock_product
            else {
                "key": "trade-in-item",
                "item": {
                    "name": trade_in["incoming_item_name"].strip(),
                    "brand": details.get("brand", ""),
                    "variant": details.get("model", ""),
                    "unit": unit,
                    "tracking_mode": tracking_mode,
                },
            }
        )
        group_name = (
            trade_in.get("stock_group_name", "").strip()
            or trade_in["incoming_item_name"].strip()
        )
        stock_receipt = create_stock_receipt(
            actor=actor,
            business_id=business_id,
            supplier_name=sale.customer_name or "Trade-in customer",
            received_at=sale.sold_at,
            status="received",
            catalog_items=[catalog_item],
            batches=[
                {
                    "name": f"Trade-in {sale.receipt_number}",
                    "groups": [
                        {
                            "name": group_name,
                            "quantity": Decimal("1"),
                            "unit": unit,
                            "types": [
                                {
                                    "catalog_key": "trade-in-item",
                                    "quantity_received": Decimal("1"),
                                    "received_unit": unit,
                                    "tracking_mode": tracking_mode,
                                    "unit_cost": trade_in["incoming_value"],
                                    "tracked_units": tracked_units,
                                }
                            ],
                        }
                    ],
                }
            ],
        )
        stock_line = stock_receipt.lines.select_related("product").first()
        stock_product = stock_line.product if stock_line else stock_product

    return TradeInDetail.objects.create(
        sale=sale,
        incoming_item_name=trade_in["incoming_item_name"].strip(),
        incoming_item_details=details,
        incoming_value=trade_in["incoming_value"],
        cash_top_up=trade_in["cash_top_up"],
        add_to_stock=trade_in.get("add_to_stock", False),
        stock_product=stock_product,
        stock_group_name=trade_in.get("stock_group_name", "").strip(),
        stock_receipt=stock_receipt,
    )


@transaction.atomic
def record_sale(*, actor, business_id, items, trade_in=None, **values):
    membership = commerce_membership(
        user=actor, business_id=business_id, permission=WorkspacePermission.RECORD_SALES
    )
    membership.business.__class__.objects.select_for_update().get(
        pk=membership.business_id
    )
    sequence = (
        Sale.objects.select_for_update()
        .filter(business=membership.business)
        .aggregate(value=Max("receipt_sequence"))["value"]
        or 0
    ) + 1
    handle = (
        "".join(
            character
            for character in membership.business.public_handle.upper()
            if character.isalnum()
        )[:8]
        or "TEED"
    )
    sale = Sale.objects.create(
        business=membership.business,
        receipt_sequence=sequence,
        receipt_number=f"{handle}-{sequence:07d}",
        recorded_by=actor,
        **values,
    )
    subtotal, total_cost = _record_items(
        sale=sale, actor=actor, business=membership.business, items=items
    )
    sale.subtotal = subtotal
    sale.total = max(Decimal("0"), subtotal - sale.discount)
    sale.cost_of_goods = total_cost
    sale.save(update_fields=["subtotal", "total", "cost_of_goods", "updated_at"])
    if sale.transaction_type == Sale.TransactionType.TRADE_IN:
        _record_trade_in(
            sale=sale, actor=actor, business_id=business_id, trade_in=trade_in
        )
    refresh_decisions(business=membership.business)
    return sale


def _sale_snapshot(sale):
    trade_in = None
    try:
        detail = sale.trade_in_detail
        trade_in = {
            "incoming_item_name": detail.incoming_item_name,
            "incoming_item_details": detail.incoming_item_details,
            "incoming_value": str(detail.incoming_value),
            "cash_top_up": str(detail.cash_top_up),
            "add_to_stock": detail.add_to_stock,
            "stock_product_id": str(detail.stock_product_id)
            if detail.stock_product_id
            else None,
            "stock_group_name": detail.stock_group_name,
        }
    except TradeInDetail.DoesNotExist:
        pass
    return {
        "sale_mode": sale.sale_mode,
        "transaction_type": sale.transaction_type,
        "sale_type": sale.sale_type,
        "customer_name": sale.customer_name,
        "customer_phone": sale.customer_phone,
        "customer_region": sale.customer_region,
        "discount": str(sale.discount),
        "payment_status": sale.payment_status,
        "warranty_months": sale.warranty_months,
        "sold_at": sale.sold_at.isoformat(),
        "trade_in": trade_in,
        "items": [
            {
                "source": item.source,
                "product_id": str(item.product_id) if item.product_id else None,
                "tracked_unit_id": str(item.tracked_unit_id)
                if item.tracked_unit_id
                else None,
                "item_name": item.item_name,
                "item_details": item.item_details,
                "acquisition_unit_cost": (
                    str(item.acquisition_unit_cost)
                    if item.acquisition_unit_cost is not None
                    else None
                ),
                "quantity": str(item.quantity),
                "unit_price": str(item.unit_price),
            }
            for item in sale.items.all()
        ],
    }


def _can_edit_sale(*, membership, actor, sale):
    if role_has_permission(membership.role, WorkspacePermission.EDIT_ANY_SALES):
        return True
    timezone_name = (
        BusinessSettings.objects.filter(business=membership.business)
        .values_list("timezone", flat=True)
        .first()
        or settings.TIME_ZONE
    )
    workspace_timezone = ZoneInfo(timezone_name)
    return (
        role_has_permission(membership.role, WorkspacePermission.EDIT_OWN_SALES)
        and sale.recorded_by_id == actor.id
        and timezone.localtime(sale.sold_at, workspace_timezone).date()
        == timezone.localdate(timezone=workspace_timezone)
    )


def _restore_sale_inventory(sale):
    tracked_ids = list(
        sale.items.exclude(tracked_unit_id=None).values_list(
            "tracked_unit_id", flat=True
        )
    )
    if tracked_ids:
        TrackedUnit.objects.filter(id__in=tracked_ids).update(
            status=TrackedUnit.Status.AVAILABLE
        )
    for allocation in SaleAllocation.objects.select_related(
        "batch", "sale_item__product"
    ).filter(sale_item__sale=sale):
        allocation.batch.quantity_remaining = (
            F("quantity_remaining") + allocation.quantity
        )
        allocation.batch.save(update_fields=["quantity_remaining", "updated_at"])
        product = allocation.sale_item.product
        if product is not None:
            product.current_quantity = F("current_quantity") + allocation.quantity
            product.save(update_fields=["current_quantity", "updated_at"])
    sale.inventory_movements.all().delete()


def _protect_trade_in_stock(sale):
    try:
        detail = sale.trade_in_detail
    except TradeInDetail.DoesNotExist:
        return
    if detail.stock_receipt_id:
        raise ValidationError(
            {
                "sale_id": [
                    "This trade-in already added the received item to Stock. "
                    "Use the coordinated trade-in correction flow before changing it."
                ]
            }
        )


@transaction.atomic
def edit_sale(*, actor, business_id, sale_id, items, trade_in=None, **values):
    membership = commerce_membership(user=actor, business_id=business_id)
    sale = (
        Sale.objects.select_for_update()
        .filter(id=sale_id, business=membership.business, status=Sale.Status.ACTIVE)
        .first()
    )
    if sale is None:
        raise ValidationError({"sale_id": ["Active sale not found."]})
    if not _can_edit_sale(membership=membership, actor=actor, sale=sale):
        raise PermissionDenied("You can only edit your own sales recorded today.")
    if sale.returns.exists():
        raise ValidationError(
            {"sale_id": ["A sale with a recorded return cannot be edited."]}
        )
    _protect_trade_in_stock(sale)
    before = _sale_snapshot(sale)
    _restore_sale_inventory(sale)
    TradeInDetail.objects.filter(sale=sale).delete()
    sale.items.all().delete()
    for key, value in values.items():
        setattr(sale, key, value)
    sale.save()
    subtotal, total_cost = _record_items(
        sale=sale, actor=actor, business=membership.business, items=items
    )
    sale.subtotal = subtotal
    sale.total = max(Decimal("0"), subtotal - sale.discount)
    sale.cost_of_goods = total_cost
    sale.save()
    if sale.transaction_type == Sale.TransactionType.TRADE_IN:
        _record_trade_in(
            sale=sale, actor=actor, business_id=business_id, trade_in=trade_in
        )
    SaleAudit.objects.create(
        sale=sale,
        actor=actor,
        action="edit",
        before=before,
        after=_sale_snapshot(sale),
    )
    refresh_decisions(business=membership.business)
    return sale


@transaction.atomic
def void_sale(*, actor, business_id, sale_id, reason):
    membership = commerce_membership(
        user=actor,
        business_id=business_id,
        permission=WorkspacePermission.VOID_SALES,
    )
    sale = (
        Sale.objects.select_for_update()
        .filter(id=sale_id, business=membership.business, status=Sale.Status.ACTIVE)
        .first()
    )
    if sale is None:
        raise ValidationError({"sale_id": ["Active sale not found."]})
    if sale.returns.exists():
        raise ValidationError({"sale_id": ["A sale with returns cannot be voided."]})
    _protect_trade_in_stock(sale)
    before = _sale_snapshot(sale)
    _restore_sale_inventory(sale)
    sale.status = Sale.Status.VOIDED
    sale.voided_at = timezone.now()
    sale.voided_by = actor
    sale.void_reason = reason
    sale.save()
    SaleAudit.objects.create(
        sale=sale,
        actor=actor,
        action="void",
        before=before,
        after={"status": sale.status, "reason": reason},
    )
    refresh_decisions(business=membership.business)
    return sale
