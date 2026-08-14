from datetime import timedelta
from decimal import Decimal
from zoneinfo import ZoneInfo

from django.conf import settings
from django.db import transaction
from django.db.models import F, Max, Sum
from django.utils import timezone
from rest_framework.exceptions import PermissionDenied, ValidationError

from apps.workspaces.business.capabilities import (
    WorkspaceCapability,
    workspace_type_has_capability,
)
from apps.workspaces.business.models import BusinessSettings
from apps.workspaces.policy import WorkspacePermission, role_has_permission
from apps.workspaces.services import require_membership

from .models import (
    Budget,
    CommerceDecision,
    Expense,
    InventoryMovement,
    Product,
    ReturnItem,
    Sale,
    SaleAllocation,
    SaleAudit,
    SaleItem,
    SaleReturn,
    StockBatch,
    StockContainer,
    StockGroup,
    StockReceipt,
    TrackedUnit,
    TrackedUnitIdentifier,
    UnitDefinition,
)


def commerce_membership(
    *, user, business_id, permission=WorkspacePermission.VIEW_COMMERCE
):
    membership = require_membership(user=user, business_id=business_id)
    if not workspace_type_has_capability(
        membership.business.workspace_type, WorkspaceCapability.BUSINESS_OPERATIONS
    ):
        raise PermissionDenied(
            "Commerce operations are not enabled for this workspace type."
        )
    if not role_has_permission(membership.role, permission):
        raise PermissionDenied(
            "Your workspace role cannot perform this commerce action."
        )
    return membership


@transaction.atomic
def create_product(*, actor, business_id, **values):
    membership = commerce_membership(
        user=actor,
        business_id=business_id,
        permission=WorkspacePermission.MANAGE_CATALOG,
    )
    membership.business.__class__.objects.select_for_update().get(
        pk=membership.business_id
    )
    values.pop("sku", None)
    next_number = Product.objects.filter(business=membership.business).count() + 1
    while Product.objects.filter(
        business=membership.business, sku=f"ITM-{next_number:06d}"
    ).exists():
        next_number += 1
    return Product.objects.create(
        business=membership.business, sku=f"ITM-{next_number:06d}", **values
    )


def _create_stock_type_line(*, actor, membership, receipt, stock_group, line, status):
    product_id = line.pop("product_id", None)
    product_values = line.pop("item", None)
    if product_id:
        product = (
            Product.objects.select_for_update()
            .filter(id=product_id, business=membership.business, is_active=True)
            .first()
        )
        if product is None:
            raise ValidationError({"batches": ["Select an available item."]})
    elif product_values:
        product_values.setdefault("group", stock_group.name)
        product_values.setdefault("unit", stock_group.base_unit or stock_group.unit)
        if (
            "selling_price" not in product_values
            and stock_group.selling_price is not None
        ):
            product_values["selling_price"] = stock_group.selling_price
        product = create_product(
            actor=actor, business_id=membership.business_id, **product_values
        )
    else:
        raise ValidationError({"batches": ["Each type needs an item."]})

    quantity = line.pop("quantity_received")
    conversion = line.pop("conversion_to_base", stock_group.conversion_to_base)
    base_quantity = quantity * conversion
    identifiers = line.pop("tracked_units", [])
    if product.tracking_mode == Product.TrackingMode.INDIVIDUAL:
        if base_quantity != base_quantity.to_integral_value():
            raise ValidationError(
                {"batches": [f"{product.name} must use a whole quantity."]}
            )
        if len(identifiers) > int(base_quantity):
            raise ValidationError(
                {"batches": [f"Too many unit records for {product.name}."]}
            )
        identifiers.extend({} for _ in range(int(base_quantity) - len(identifiers)))
    unit_cost = line.pop("unit_cost", None)
    batch = StockBatch.objects.create(
        receipt=receipt,
        stock_group=stock_group,
        product=product,
        reference=receipt.reference,
        quantity_received=base_quantity,
        quantity_remaining=base_quantity
        if status == StockReceipt.Status.RECEIVED
        else 0,
        conversion_to_base=conversion,
        received_unit=line.pop("received_unit", stock_group.unit),
        unit_cost=unit_cost if unit_cost is not None else stock_group.buying_price,
        received_at=receipt.received_at or timezone.now(),
        supplier_name=receipt.supplier_name,
        recorded_by=actor,
        **line,
    )
    for index, identifier in enumerate(identifiers, start=1):
        external_identifiers = identifier.pop("identifiers", [])
        legacy_imei = identifier.pop("imei", "")
        legacy_serial = identifier.pop("serial_number", "")
        unit = TrackedUnit.objects.create(
            stock_line=batch,
            product=product,
            internal_serial=f"UNIT-{str(batch.id).replace('-', '')[:8].upper()}-{index:04d}",
            imei=next(
                (
                    item["value"]
                    for item in external_identifiers
                    if item["kind"] == "imei"
                ),
                legacy_imei,
            ),
            serial_number=next(
                (
                    item["value"]
                    for item in external_identifiers
                    if item["kind"] == "serial"
                ),
                legacy_serial,
            ),
            **identifier,
        )
        TrackedUnitIdentifier.objects.bulk_create(
            [
                TrackedUnitIdentifier(unit=unit, **external_identifier)
                for external_identifier in external_identifiers
            ]
        )
    if status == StockReceipt.Status.RECEIVED:
        Product.objects.filter(pk=product.pk).update(
            current_quantity=F("current_quantity") + base_quantity
        )
        InventoryMovement.objects.create(
            business=membership.business,
            product=product,
            batch=batch,
            kind=InventoryMovement.Kind.RECEIPT,
            quantity_delta=base_quantity,
            occurred_at=batch.received_at,
            reason=f"{receipt.reference} received.",
            recorded_by=actor,
        )
    return batch


@transaction.atomic
def create_stock_receipt(*, actor, business_id, batches, status="received", **values):
    membership = commerce_membership(
        user=actor,
        business_id=business_id,
        permission=WorkspacePermission.MANAGE_INVENTORY,
    )
    membership.business.__class__.objects.select_for_update().get(
        pk=membership.business_id
    )
    sequence = (
        StockReceipt.objects.select_for_update()
        .filter(business=membership.business)
        .aggregate(value=Max("sequence"))["value"]
        or 0
    ) + 1
    receipt = StockReceipt.objects.create(
        business=membership.business,
        sequence=sequence,
        reference=f"MZIGO-{sequence:06d}",
        status=status,
        recorded_by=actor,
        **values,
    )
    for batch_position, batch_values in enumerate(batches):
        groups = batch_values.pop("groups")
        container = StockContainer.objects.create(
            receipt=receipt,
            code=f"BAT-{batch_position + 1:03d}",
            position=batch_position,
            **batch_values,
        )
        for group_position, group_values in enumerate(groups):
            types = group_values.pop("types", [])
            custom_unit_name = group_values.pop("custom_unit_name", "").strip()
            if custom_unit_name:
                unit_definition = UnitDefinition.objects.filter(
                    business=membership.business, name__iexact=custom_unit_name
                ).first()
                if unit_definition is None:
                    unit_number = (
                        UnitDefinition.objects.filter(
                            business=membership.business
                        ).count()
                        + 1
                    )
                    unit_definition = UnitDefinition.objects.create(
                        business=membership.business,
                        code=f"UNITDEF-{unit_number:06d}",
                        name=custom_unit_name,
                        base_unit=group_values.get("base_unit", ""),
                        conversion_to_base=group_values.get(
                            "conversion_to_base", Decimal("1")
                        ),
                    )
                group_values["unit"] = unit_definition.name
                group_values["base_unit"] = unit_definition.base_unit
                group_values["conversion_to_base"] = unit_definition.conversion_to_base
            stock_group = StockGroup.objects.create(
                batch=container,
                code=f"GRP-{group_position + 1:03d}",
                position=group_position,
                **group_values,
            )
            if not types:
                types = [
                    {
                        "item": {
                            "name": stock_group.name,
                            "group": stock_group.name,
                            "unit": stock_group.base_unit or stock_group.unit,
                            "selling_price": stock_group.selling_price,
                        },
                        "quantity_received": stock_group.quantity,
                        "received_unit": stock_group.unit,
                        "conversion_to_base": stock_group.conversion_to_base,
                        "unit_cost": stock_group.buying_price,
                    }
                ]
            for line in types:
                _create_stock_type_line(
                    actor=actor,
                    membership=membership,
                    receipt=receipt,
                    stock_group=stock_group,
                    line=line,
                    status=status,
                )
    refresh_decisions(business=membership.business)
    return receipt


@transaction.atomic
def receive_draft_stock(*, actor, business_id, receipt_id, received_at=None):
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
    if receipt is None or receipt.status != StockReceipt.Status.DRAFT:
        raise ValidationError({"receipt": ["Select a draft stock receipt."]})
    receipt.received_at = received_at or timezone.now()
    receipt.status = StockReceipt.Status.RECEIVED
    receipt.save(update_fields=["received_at", "status", "updated_at"])
    for batch in receipt.lines.select_for_update().select_related("product"):
        batch.received_at = receipt.received_at
        batch.quantity_remaining = batch.quantity_received
        batch.save(update_fields=["received_at", "quantity_remaining", "updated_at"])
        Product.objects.filter(pk=batch.product_id).update(
            current_quantity=F("current_quantity") + batch.quantity_received
        )
        InventoryMovement.objects.create(
            business=membership.business,
            product=batch.product,
            batch=batch,
            kind=InventoryMovement.Kind.RECEIPT,
            quantity_delta=batch.quantity_received,
            occurred_at=receipt.received_at,
            reason=f"{receipt.reference} received.",
            recorded_by=actor,
        )
    refresh_decisions(business=membership.business)
    return receipt


@transaction.atomic
def archive_stock_receipt(*, actor, business_id, receipt_id):
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
    receipt.status = StockReceipt.Status.ARCHIVED
    receipt.save(update_fields=["status", "updated_at"])
    return receipt


@transaction.atomic
def receive_stock(*, actor, business_id, product_id, **values):
    membership = commerce_membership(
        user=actor,
        business_id=business_id,
        permission=WorkspacePermission.MANAGE_INVENTORY,
    )
    product = (
        Product.objects.select_for_update()
        .filter(id=product_id, business=membership.business, is_active=True)
        .first()
    )
    if product is None:
        raise ValidationError(
            {"product_id": ["Select an active product from this workspace."]}
        )
    quantity = values.pop("quantity_received")
    batch = StockBatch.objects.create(
        product=product,
        quantity_received=quantity,
        quantity_remaining=quantity,
        recorded_by=actor,
        **values,
    )
    product.current_quantity = F("current_quantity") + quantity
    product.save(update_fields=["current_quantity", "updated_at"])
    product.refresh_from_db()
    InventoryMovement.objects.create(
        business=membership.business,
        product=product,
        batch=batch,
        kind=InventoryMovement.Kind.RECEIPT,
        quantity_delta=quantity,
        occurred_at=batch.received_at,
        reason=f"Stock batch {batch.reference or batch.id} received.",
        recorded_by=actor,
    )
    refresh_decisions(business=membership.business)
    return batch


def _allocate_fifo(*, product, sale_item, quantity, actor, sale):
    remaining = quantity
    cost_total = Decimal("0")
    batches = (
        StockBatch.objects.select_for_update()
        .filter(product=product, quantity_remaining__gt=0)
        .order_by("received_at", "created_at")
    )
    for batch in batches:
        allocated = min(remaining, batch.quantity_remaining)
        if allocated <= 0:
            continue
        effective_unit_cost = (batch.unit_cost or Decimal("0")) + (
            batch.additional_cost / batch.quantity_received
        )
        SaleAllocation.objects.create(
            sale_item=sale_item,
            batch=batch,
            quantity=allocated,
            unit_cost=effective_unit_cost,
        )
        batch.quantity_remaining = F("quantity_remaining") - allocated
        batch.save(update_fields=["quantity_remaining", "updated_at"])
        cost_total += allocated * effective_unit_cost
        InventoryMovement.objects.create(
            business=product.business,
            product=product,
            batch=batch,
            sale=sale,
            kind=InventoryMovement.Kind.SALE,
            quantity_delta=-allocated,
            reason=f"Allocated to receipt {sale.receipt_number}.",
            occurred_at=sale.sold_at,
            recorded_by=actor,
        )
        remaining -= allocated
        if remaining == 0:
            break
    if remaining > 0:
        raise ValidationError({"items": [f"Insufficient stock for {product.name}."]})
    return cost_total


@transaction.atomic
def record_sale(*, actor, business_id, items, **values):
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
    subtotal = Decimal("0")
    total_cost = Decimal("0")
    for item in items:
        product = (
            Product.objects.select_for_update()
            .filter(id=item["product_id"], business=membership.business, is_active=True)
            .first()
        )
        if product is None:
            raise ValidationError({"items": ["A selected product is unavailable."]})
        quantity = item["quantity"]
        if product.current_quantity < quantity:
            raise ValidationError(
                {
                    "items": [
                        f"Only {product.current_quantity} {product.unit} of "
                        f"{product.name} are available."
                    ]
                }
            )
        unit_price = item.get("unit_price", product.selling_price)
        line_total = quantity * unit_price
        sale_item = SaleItem.objects.create(
            sale=sale,
            product=product,
            quantity=quantity,
            unit_price=unit_price,
            line_total=line_total,
        )
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
    sale.subtotal = subtotal
    sale.total = max(Decimal("0"), subtotal - sale.discount)
    sale.cost_of_goods = total_cost
    sale.save(update_fields=["subtotal", "total", "cost_of_goods", "updated_at"])
    refresh_decisions(business=membership.business)
    return sale


def _sale_snapshot(sale):
    return {
        "sale_type": sale.sale_type,
        "customer_name": sale.customer_name,
        "customer_phone": sale.customer_phone,
        "discount": str(sale.discount),
        "payment_status": sale.payment_status,
        "sold_at": sale.sold_at.isoformat(),
        "items": [
            {
                "product_id": str(item.product_id),
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


@transaction.atomic
def edit_sale(*, actor, business_id, sale_id, items, **values):
    membership = commerce_membership(user=actor, business_id=business_id)
    sale = (
        Sale.objects.select_for_update()
        .filter(
            id=sale_id,
            business=membership.business,
            status=Sale.Status.ACTIVE,
        )
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
    before = _sale_snapshot(sale)
    for allocation in SaleAllocation.objects.select_related(
        "batch", "sale_item__product"
    ).filter(sale_item__sale=sale):
        allocation.batch.quantity_remaining = (
            F("quantity_remaining") + allocation.quantity
        )
        allocation.batch.save(update_fields=["quantity_remaining", "updated_at"])
        product = allocation.sale_item.product
        product.current_quantity = F("current_quantity") + allocation.quantity
        product.save(update_fields=["current_quantity", "updated_at"])
    sale.inventory_movements.all().delete()
    sale.items.all().delete()
    for key, value in values.items():
        setattr(sale, key, value)
    sale.save()
    subtotal = Decimal("0")
    total_cost = Decimal("0")
    for item in items:
        product = Product.objects.select_for_update().get(
            id=item["product_id"], business=membership.business, is_active=True
        )
        quantity = item["quantity"]
        unit_price = item.get("unit_price", product.selling_price)
        sale_item = SaleItem.objects.create(
            sale=sale,
            product=product,
            quantity=quantity,
            unit_price=unit_price,
            line_total=quantity * unit_price,
        )
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
        subtotal += sale_item.line_total
        total_cost += cost
    sale.subtotal = subtotal
    sale.total = max(Decimal("0"), subtotal - sale.discount)
    sale.cost_of_goods = total_cost
    sale.save()
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
        .filter(
            id=sale_id,
            business=membership.business,
            status=Sale.Status.ACTIVE,
        )
        .first()
    )
    if sale is None:
        raise ValidationError({"sale_id": ["Active sale not found."]})
    if sale.returns.exists():
        raise ValidationError({"sale_id": ["A sale with returns cannot be voided."]})
    before = _sale_snapshot(sale)
    for allocation in SaleAllocation.objects.select_related(
        "batch", "sale_item__product"
    ).filter(sale_item__sale=sale):
        allocation.batch.quantity_remaining = (
            F("quantity_remaining") + allocation.quantity
        )
        allocation.batch.save(update_fields=["quantity_remaining", "updated_at"])
        product = allocation.sale_item.product
        product.current_quantity = F("current_quantity") + allocation.quantity
        product.save(update_fields=["current_quantity", "updated_at"])
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


@transaction.atomic
def adjust_stock(
    *, actor, business_id, product_id, kind, quantity, reason, occurred_at
):
    membership = commerce_membership(
        user=actor,
        business_id=business_id,
        permission=WorkspacePermission.MANAGE_INVENTORY,
    )
    product = (
        Product.objects.select_for_update()
        .filter(id=product_id, business=membership.business)
        .first()
    )
    if product is None:
        raise ValidationError({"product_id": ["Product not found."]})
    delta = (
        quantity
        if kind == InventoryMovement.Kind.CORRECTION and quantity > 0
        else -abs(quantity)
    )
    if product.current_quantity + delta < 0:
        raise ValidationError({"quantity": ["The adjustment exceeds available stock."]})
    product.current_quantity = F("current_quantity") + delta
    product.save(update_fields=["current_quantity", "updated_at"])
    movement = InventoryMovement.objects.create(
        business=membership.business,
        product=product,
        kind=kind,
        quantity_delta=delta,
        reason=reason,
        occurred_at=occurred_at,
        recorded_by=actor,
    )
    refresh_decisions(business=membership.business)
    return movement


@transaction.atomic
def record_return(*, actor, business_id, sale_id, items, **values):
    membership = commerce_membership(
        user=actor, business_id=business_id, permission=WorkspacePermission.RECORD_SALES
    )
    sale = Sale.objects.filter(id=sale_id, business=membership.business).first()
    if sale is None:
        raise ValidationError({"sale_id": ["Sale not found."]})
    record = SaleReturn.objects.create(sale=sale, recorded_by=actor, **values)
    total = Decimal("0")
    for item in items:
        sale_item = (
            SaleItem.objects.select_for_update()
            .select_related("product")
            .filter(id=item["sale_item_id"], sale=sale)
            .first()
        )
        if sale_item is None:
            raise ValidationError(
                {"items": ["Returned item does not belong to this sale."]}
            )
        quantity = item["quantity"]
        if sale_item.returned_quantity + quantity > sale_item.quantity:
            raise ValidationError(
                {"items": ["Return quantity exceeds the sold quantity."]}
            )
        amount = quantity * sale_item.unit_price
        unit_cost = sale_item.cost_total / sale_item.quantity
        cost_total = quantity * unit_cost
        ReturnItem.objects.create(
            return_record=record,
            sale_item=sale_item,
            quantity=quantity,
            condition=item["condition"],
            amount=amount,
            cost_total=cost_total,
        )
        previously_returned = sale_item.returned_quantity
        sale_item.returned_quantity = F("returned_quantity") + quantity
        sale_item.save(update_fields=["returned_quantity", "updated_at"])
        if item["condition"] == "sellable":
            product = sale_item.product
            product.current_quantity = F("current_quantity") + quantity
            product.save(update_fields=["current_quantity", "updated_at"])
            remaining_return = quantity
            for allocation in sale_item.allocations.select_related("batch").order_by(
                "-batch__received_at", "-batch__created_at"
            ):
                already_restored = min(previously_returned, allocation.quantity)
                previously_returned -= already_restored
                restorable = allocation.quantity - already_restored
                restored = min(remaining_return, restorable)
                if restored <= 0:
                    continue
                allocation.batch.quantity_remaining = F("quantity_remaining") + restored
                allocation.batch.save(
                    update_fields=["quantity_remaining", "updated_at"]
                )
                InventoryMovement.objects.create(
                    business=membership.business,
                    product=product,
                    batch=allocation.batch,
                    sale=sale,
                    kind=InventoryMovement.Kind.RETURN,
                    quantity_delta=restored,
                    reason=record.reason,
                    occurred_at=record.returned_at,
                    recorded_by=actor,
                )
                remaining_return -= restored
                if remaining_return == 0:
                    break
        total += amount
    record.total = total
    record.save(update_fields=["total", "updated_at"])
    refresh_decisions(business=membership.business)
    return record


def refresh_decisions(*, business):
    active_keys = set()
    for product in Product.objects.filter(business=business, is_active=True):
        if product.current_quantity <= product.low_stock_threshold:
            key = f"low-stock:{product.id}"
            active_keys.add(key)
            CommerceDecision.objects.update_or_create(
                business=business,
                key=key,
                defaults={
                    "severity": CommerceDecision.Severity.URGENT
                    if product.current_quantity == 0
                    else CommerceDecision.Severity.ATTENTION,
                    "title": f"{product.name} needs stock attention",
                    "explanation": (
                        f"{product.current_quantity} {product.unit} remain; "
                        f"the alert level is {product.low_stock_threshold}."
                    ),
                    "action_path": "/commerce/inventory",
                    "context": {"product_id": str(product.id)},
                    "resolved_at": None,
                },
            )
        stale = product.movements.filter(
            kind=InventoryMovement.Kind.SALE,
            occurred_at__gte=timezone.now() - timedelta(days=30),
        ).exists()
        if product.current_quantity > 0 and not stale:
            key = f"slow-stock:{product.id}"
            active_keys.add(key)
            CommerceDecision.objects.update_or_create(
                business=business,
                key=key,
                defaults={
                    "severity": CommerceDecision.Severity.INFO,
                    "title": f"Review slow-moving {product.name}",
                    "explanation": (
                        "Stock remains but no sale was recorded in the last 30 days."
                    ),
                    "action_path": "/commerce/products",
                    "context": {"product_id": str(product.id)},
                    "resolved_at": None,
                },
            )
    CommerceDecision.objects.filter(
        business=business, resolved_at__isnull=True
    ).exclude(key__in=active_keys).update(resolved_at=timezone.now())


def commerce_overview(*, user, business_id):
    membership = commerce_membership(user=user, business_id=business_id)
    business = membership.business
    refresh_decisions(business=business)
    today = timezone.localdate()
    sales = Sale.objects.filter(
        business=business, sold_at__date=today, status=Sale.Status.ACTIVE
    )
    expenses = Expense.objects.filter(business=business, incurred_at__date=today)
    returns = ReturnItem.objects.filter(
        return_record__sale__business=business,
        return_record__returned_at__date=today,
    )
    totals = sales.aggregate(revenue=Sum("total"), cost=Sum("cost_of_goods"))
    expense_total = expenses.aggregate(total=Sum("amount"))["total"] or Decimal("0")
    return_totals = returns.aggregate(revenue=Sum("amount"), cost=Sum("cost_total"))
    revenue = (totals["revenue"] or Decimal("0")) - (
        return_totals["revenue"] or Decimal("0")
    )
    cost = (totals["cost"] or Decimal("0")) - (return_totals["cost"] or Decimal("0"))
    products = Product.objects.filter(business=business, is_active=True)
    can_manage_finance = role_has_permission(
        membership.role, WorkspacePermission.MANAGE_FINANCE
    )

    def financial_value(value):
        return value if can_manage_finance else None

    return {
        "pulse": {
            "revenue": revenue,
            "cost_of_goods": financial_value(cost),
            "gross_profit": financial_value(revenue - cost),
            "operating_result": financial_value(revenue - cost - expense_total),
            "expenses": financial_value(expense_total),
            "sales_count": sales.count(),
            "low_stock_count": products.filter(
                current_quantity__lte=F("low_stock_threshold")
            ).count(),
            "stock_value": financial_value(
                sum(
                    (
                        p.current_quantity
                        * (
                            p.stock_batches.order_by("-received_at")
                            .values_list("unit_cost", flat=True)
                            .first()
                            or Decimal("0")
                        )
                    )
                    for p in products
                )
            ),
            "confidence": (
                "reliable"
                if not products.filter(
                    current_quantity__gt=0, stock_batches__isnull=True
                ).exists()
                else "partial"
            ),
            "can_manage_finance": can_manage_finance,
        },
        "decisions": CommerceDecision.objects.filter(
            business=business, resolved_at__isnull=True
        )[:12],
        "recent_sales": sales.prefetch_related("items__product")[:8],
    }


@transaction.atomic
def create_expense(*, actor, business_id, **values):
    membership = commerce_membership(
        user=actor,
        business_id=business_id,
        permission=WorkspacePermission.MANAGE_FINANCE,
    )
    return Expense.objects.create(
        business=membership.business, recorded_by=actor, **values
    )


@transaction.atomic
def set_budget(*, actor, business_id, **values):
    membership = commerce_membership(
        user=actor,
        business_id=business_id,
        permission=WorkspacePermission.MANAGE_FINANCE,
    )
    budget, _ = Budget.objects.update_or_create(
        business=membership.business,
        category=values["category"],
        month=values["month"],
        defaults={"planned_amount": values["planned_amount"]},
    )
    return budget
