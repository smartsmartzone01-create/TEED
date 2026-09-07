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


def _resolve_catalog_products(*, actor, membership, catalog_items):
    resolved = {}
    for catalog_item in catalog_items or []:
        key = catalog_item["key"]
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
        else:
            product_values = dict(catalog_item["item"])
            family_name = catalog_item.get("family_name", "").strip()
            tracking_mode = product_values.get(
                "tracking_mode", Product.TrackingMode.QUANTITY
            )
            product = Product.objects.filter(
                business=membership.business,
                name__iexact=product_values["name"],
                brand__iexact=product_values.get("brand", ""),
                variant__iexact=product_values.get("variant", ""),
                unit=product_values["unit"],
                tracking_mode=tracking_mode,
                is_active=True,
            ).first()
            if product is None:
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
                    product_values["family"] = family
                product = create_product(
                    actor=actor,
                    business_id=membership.business_id,
                    **product_values,
                )
        resolved[key] = product
    return resolved


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
    """Create the flat Stock v2 receipt while preserving legacy nested writes."""

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
    catalog_products = _resolve_catalog_products(
        actor=actor,
        membership=membership,
        catalog_items=catalog_items,
    )
    catalog_product_ids = {key: product.id for key, product in catalog_products.items()}

    for line_values in lines:
        line = dict(line_values)
        catalog_key = line.get("catalog_key")
        product = catalog_products.get(catalog_key)
        if product is None:
            raise ValidationError(
                {"catalog_items": ["Select a product identification from this stock."]}
            )
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
        line["tracking_mode"] = product.tracking_mode
        _create_stock_type_line(
            actor=actor,
            membership=membership,
            receipt=receipt,
            stock_group=None,
            line=line,
            status=status,
            catalog_products=catalog_product_ids,
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
