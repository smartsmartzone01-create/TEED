from decimal import Decimal

from django.db import transaction
from django.db.models import Max
from rest_framework.exceptions import ValidationError

from apps.workspaces.policy import WorkspacePermission

from ..catalog.models import Product, ProductFamily
from ..services import (
    _create_stock_type_line,
    _sync_stock_expense,
    commerce_membership,
    create_product,
    refresh_decisions,
)
from ..services import create_stock_receipt as create_legacy_stock_receipt
from .models import StockReceipt, StockReceiptAudit


def current_stock_receipts(*, business):
    return StockReceipt.objects.filter(
        business=business,
        parent_receipt__isnull=True,
        status__in=[StockReceipt.Status.DRAFT, StockReceipt.Status.RECEIVED],
    )


def _sku_variant_from_unit(base_variant, unit):
    parts = []
    seen = set()
    for raw_value in (
        base_variant,
        unit.get("color", ""),
        unit.get("capacity", ""),
    ):
        value = str(raw_value or "").strip()
        folded = value.casefold()
        if value and folded not in seen:
            seen.add(folded)
            parts.append(value)
    return " · ".join(parts)


def _individual_sku_groups(line, base_variant):
    tracked_units = list(line.get("tracked_units") or [])
    if not tracked_units:
        return []

    quantity = Decimal(str(line.get("quantity_received") or "0"))
    conversion = Decimal(str(line.get("conversion_to_base") or "1"))
    base_quantity = quantity * conversion
    if base_quantity != base_quantity.to_integral_value():
        return []
    if len(tracked_units) != int(base_quantity):
        return []

    has_configuration = any(
        str(unit.get("color", "") or "").strip()
        or str(unit.get("capacity", "") or "").strip()
        for unit in tracked_units
    )
    if not has_configuration:
        return []

    groups = {}
    for unit in tracked_units:
        variant = _sku_variant_from_unit(base_variant, unit)
        groups.setdefault(variant, []).append(dict(unit))
    return list(groups.items())


def _split_line_for_units(line, tracked_units, product_unit):
    split_line = dict(line)
    conversion = Decimal(str(split_line.get("conversion_to_base") or "1"))
    received_unit_cost = split_line.get("unit_cost")
    split_line["quantity_received"] = Decimal(len(tracked_units))
    split_line["conversion_to_base"] = Decimal("1")
    split_line["received_unit"] = product_unit
    split_line["tracked_units"] = tracked_units
    if received_unit_cost is not None:
        split_line["unit_cost"] = Decimal(str(received_unit_cost)) / conversion
    return split_line


def _resolve_catalog_product(
    *,
    actor,
    membership,
    catalog_item,
    variant_override=None,
):
    product_id = catalog_item.get("product_id")
    if product_id:
        product = Product.objects.filter(
            id=product_id,
            business=membership.business,
            is_active=True,
        ).first()
        if product is None:
            raise ValidationError(
                {"catalog_items": ["Select an available product identification."]}
            )
        return product

    product_values = dict(catalog_item["item"])
    if variant_override is not None:
        product_values["variant"] = variant_override

    family_name = catalog_item.get("family_name", "").strip()
    family = None
    if family_name:
        family = ProductFamily.objects.filter(
            business=membership.business,
            name__iexact=family_name,
            brand__iexact=product_values.get("brand", ""),
            is_active=True,
        ).first()
        if family is None:
            family = ProductFamily.objects.create(
                business=membership.business,
                name=family_name,
                brand=product_values.get("brand", ""),
            )

    tracking_mode = product_values.get(
        "tracking_mode", Product.TrackingMode.QUANTITY
    )
    products = Product.objects.filter(
        business=membership.business,
        name__iexact=product_values["name"],
        brand__iexact=product_values.get("brand", ""),
        variant__iexact=product_values.get("variant", ""),
        unit=product_values["unit"],
        tracking_mode=tracking_mode,
        is_active=True,
    )
    if family is not None:
        products = products.filter(family=family)

    product = products.first()
    if product is None:
        if family is not None:
            product_values["family"] = family
        product = create_product(
            actor=actor,
            business_id=membership.business_id,
            **product_values,
        )
    return product


def _resolve_catalog_products(*, actor, membership, catalog_items):
    return {
        catalog_item["key"]: _resolve_catalog_product(
            actor=actor,
            membership=membership,
            catalog_item=catalog_item,
        )
        for catalog_item in catalog_items or []
    }


def _create_resolved_stock_line(
    *,
    actor,
    membership,
    receipt,
    status,
    product,
    line,
):
    requested_tracking = line.get("tracking_mode")
    if requested_tracking and requested_tracking != product.tracking_mode:
        raise ValidationError(
            {
                "lines": [
                    f"{product.name} is configured for {product.tracking_mode} tracking. "
                    "Change the product catalog policy instead of overriding it on a receipt."
                ]
            }
        )

    resolved_line = dict(line)
    resolved_line.pop("catalog_key", None)
    resolved_line["product_id"] = product.id
    resolved_line["tracking_mode"] = product.tracking_mode
    return _create_stock_type_line(
        actor=actor,
        membership=membership,
        receipt=receipt,
        stock_group=None,
        line=resolved_line,
        status=status,
    )


@transaction.atomic
def create_stock_receipt_v2(
    *,
    actor,
    business_id,
    lines=None,
    batches=None,
    catalog_items=None,
    status="received",
    parent_receipt_id=None,
    **values,
):
    """Create the flat Stock v2 receipt while preserving legacy nested writes.

    For new individually tracked products, color/capacity are treated as sellable
    configuration. One receipt line may therefore resolve into multiple Product/SKU
    identities while keeping each acquisition line and its FIFO cost history intact.
    """

    if not lines:
        return create_legacy_stock_receipt(
            actor=actor,
            business_id=business_id,
            batches=batches or [],
            catalog_items=catalog_items,
            status=status,
            parent_receipt_id=parent_receipt_id,
            **values,
        )

    if batches:
        raise ValidationError(
            {"stock": ["Use direct product lines or legacy batches, not both."]}
        )

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

    parent_receipt = None
    if parent_receipt_id:
        parent_receipt = StockReceipt.objects.filter(
            id=parent_receipt_id,
            business=membership.business,
            status=StockReceipt.Status.RECEIVED,
        ).first()
        if parent_receipt is None:
            raise ValidationError(
                {"parent_receipt_id": ["Select received stock for this delivery."]}
            )
        if parent_receipt.parent_receipt_id:
            parent_receipt = parent_receipt.parent_receipt

    receipt = StockReceipt.objects.create(
        business=membership.business,
        parent_receipt=parent_receipt,
        sequence=sequence,
        reference=f"MZIGO-{sequence:06d}",
        status=status,
        recorded_by=actor,
        **values,
    )

    catalog_items_by_key = {item["key"]: item for item in (catalog_items or [])}

    for line_values in lines:
        line = dict(line_values)
        catalog_key = line.get("catalog_key")
        catalog_item = catalog_items_by_key.get(catalog_key)
        if catalog_item is None:
            raise ValidationError(
                {"catalog_items": ["Select a product identification from this stock."]}
            )

        new_item_values = catalog_item.get("item")
        should_resolve_configuration = (
            new_item_values is not None
            and new_item_values.get(
                "tracking_mode", Product.TrackingMode.QUANTITY
            )
            == Product.TrackingMode.INDIVIDUAL
        )

        configuration_groups = (
            _individual_sku_groups(
                line,
                new_item_values.get("variant", ""),
            )
            if should_resolve_configuration
            else []
        )

        if not configuration_groups:
            product = _resolve_catalog_product(
                actor=actor,
                membership=membership,
                catalog_item=catalog_item,
            )
            _create_resolved_stock_line(
                actor=actor,
                membership=membership,
                receipt=receipt,
                status=status,
                product=product,
                line=line,
            )
            continue

        if len(configuration_groups) == 1:
            variant, tracked_units = configuration_groups[0]
            product = _resolve_catalog_product(
                actor=actor,
                membership=membership,
                catalog_item=catalog_item,
                variant_override=variant,
            )
            resolved_line = dict(line)
            resolved_line["tracked_units"] = tracked_units
            _create_resolved_stock_line(
                actor=actor,
                membership=membership,
                receipt=receipt,
                status=status,
                product=product,
                line=resolved_line,
            )
            continue

        for variant, tracked_units in configuration_groups:
            product = _resolve_catalog_product(
                actor=actor,
                membership=membership,
                catalog_item=catalog_item,
                variant_override=variant,
            )
            split_line = _split_line_for_units(
                line,
                tracked_units,
                product.unit,
            )
            _create_resolved_stock_line(
                actor=actor,
                membership=membership,
                receipt=receipt,
                status=status,
                product=product,
                line=split_line,
            )

    if status == StockReceipt.Status.RECEIVED:
        _sync_stock_expense(receipt=receipt, actor=actor)
    if parent_receipt:
        StockReceiptAudit.objects.create(
            receipt=parent_receipt,
            actor=actor,
            action="late_delivery",
            before={},
            after={
                "delivery": receipt.reference,
                "received_at": str(receipt.received_at),
            },
        )
    refresh_decisions(business=membership.business)
    return receipt


@transaction.atomic
def archive_draft_stock_receipt(*, actor, business_id, receipt_id):
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
    if receipt.status != StockReceipt.Status.DRAFT:
        raise ValidationError(
            {"receipt": ["Received stock cannot be removed or archived."]}
        )
    receipt.status = StockReceipt.Status.ARCHIVED
    receipt.save(update_fields=["status", "updated_at"])
    return receipt
