from django.db.models import F, Q

from ..catalog.models import Product
from .models import (
    InventoryMovement,
    StockReceipt,
    TrackedUnit,
)


def _item_payload(product):
    return {
        "product_id": str(product.id),
        "name": product.name,
        "sku": product.sku,
        "unit": product.unit,
        "current_quantity": product.current_quantity,
        "low_stock_threshold": product.low_stock_threshold,
    }


def _tracked_unit_payload(unit):
    identifiers = [
        {"kind": identifier.kind, "value": identifier.value}
        for identifier in unit.identifiers.all()
    ]
    if unit.imei and not any(item["kind"] == "imei" for item in identifiers):
        identifiers.append({"kind": "imei", "value": unit.imei})
    if unit.serial_number and not any(
        item["kind"] == "serial" for item in identifiers
    ):
        identifiers.append({"kind": "serial", "value": unit.serial_number})

    stock_line = unit.stock_line
    group = stock_line.stock_group
    receipt = stock_line.receipt or (group.batch.receipt if group else None)
    return {
        "unit_id": str(unit.id),
        "internal_serial": unit.internal_serial,
        "status": unit.status,
        "product": {
            "product_id": str(unit.product_id),
            "name": unit.product.name,
            "sku": unit.product.sku,
            "unit": unit.product.unit,
        },
        "model_name": unit.model_name,
        "brand": unit.brand,
        "color": unit.color,
        "capacity": unit.capacity,
        "identifiers": identifiers,
        "stock": {
            "receipt_reference": receipt.reference if receipt else "",
            "batch_name": group.batch.name if group else "",
            "group_name": group.name if group else "",
            "stock_line_reference": stock_line.reference,
        },
    }


def inventory_health(*, business, item_limit=8):
    """Return deterministic inventory availability and attention signals."""
    products = Product.objects.filter(business=business, is_active=True)
    stocked_products = products.filter(
        movements__kind=InventoryMovement.Kind.RECEIPT,
    ).distinct()
    available_products = products.filter(current_quantity__gt=0)
    low_stock_products = available_products.filter(
        low_stock_threshold__gt=0,
        current_quantity__lte=F("low_stock_threshold"),
    ).order_by("current_quantity", "name", "id")
    sold_out_products = stocked_products.filter(current_quantity=0).order_by(
        "name", "id"
    )

    return {
        "active_products": products.count(),
        "available_skus": available_products.count(),
        "low_stock_count": low_stock_products.count(),
        "sold_out_count": sold_out_products.count(),
        "low_stock_items": [
            _item_payload(product) for product in low_stock_products[:item_limit]
        ],
        "sold_out_items": [
            _item_payload(product) for product in sold_out_products[:item_limit]
        ],
    }


def inventory_search(*, business, query, limit=8):
    """Search current workspace Stock by product, receipt, batch, or tracked identifier."""
    cleaned = str(query or "").strip()
    if not cleaned:
        return {"query": cleaned, "products": [], "receipts": [], "tracked_units": []}

    products = (
        Product.objects.filter(business=business, is_active=True)
        .filter(
            Q(name__icontains=cleaned)
            | Q(sku__icontains=cleaned)
            | Q(barcode__icontains=cleaned)
            | Q(brand__icontains=cleaned)
            | Q(variant__icontains=cleaned)
        )
        .order_by("name", "sku", "id")[:limit]
    )

    receipts = (
        StockReceipt.objects.filter(business=business)
        .filter(
            Q(reference__icontains=cleaned)
            | Q(batches__name__icontains=cleaned)
            | Q(batches__code__icontains=cleaned)
            | Q(batches__groups__name__icontains=cleaned)
            | Q(batches__groups__code__icontains=cleaned)
            | Q(lines__product__name__icontains=cleaned)
            | Q(lines__product__sku__icontains=cleaned)
            | Q(batches__groups__type_lines__product__name__icontains=cleaned)
            | Q(batches__groups__type_lines__product__sku__icontains=cleaned)
        )
        .distinct()
        .order_by("-created_at")[:limit]
    )

    tracked_units = (
        TrackedUnit.objects.filter(product__business=business)
        .filter(
            Q(internal_serial__icontains=cleaned)
            | Q(imei__icontains=cleaned)
            | Q(serial_number__icontains=cleaned)
            | Q(identifiers__value__icontains=cleaned)
            | Q(model_name__icontains=cleaned)
            | Q(brand__icontains=cleaned)
            | Q(product__name__icontains=cleaned)
            | Q(product__sku__icontains=cleaned)
        )
        .select_related(
            "product",
            "stock_line",
            "stock_line__receipt",
            "stock_line__stock_group",
            "stock_line__stock_group__batch",
            "stock_line__stock_group__batch__receipt",
        )
        .prefetch_related("identifiers")
        .distinct()
        .order_by("internal_serial")[:limit]
    )

    return {
        "query": cleaned,
        "products": [_item_payload(product) for product in products],
        "receipts": [
            {
                "receipt_id": str(receipt.id),
                "reference": receipt.reference,
                "status": receipt.status,
                "received_at": receipt.received_at.isoformat()
                if receipt.received_at
                else None,
            }
            for receipt in receipts
        ],
        "tracked_units": [_tracked_unit_payload(unit) for unit in tracked_units],
    }


def stock_receipt_detail(*, business, reference):
    """Return product/batch structure for one stock receipt without internal costs."""
    cleaned = str(reference or "").strip()
    receipt = (
        StockReceipt.objects.filter(business=business, reference__iexact=cleaned)
        .prefetch_related(
            "lines__product",
            "batches__groups__type_lines__product",
        )
        .first()
    )
    if receipt is None:
        return {"reference": cleaned, "found": False}

    grouped_line_ids = set()
    batches = []
    for batch in receipt.batches.all():
        groups = []
        for group in batch.groups.all():
            products = []
            for line in group.type_lines.all():
                grouped_line_ids.add(line.id)
                products.append(
                    {
                        "stock_line_id": str(line.id),
                        "stock_line_reference": line.reference,
                        "product_id": str(line.product_id),
                        "name": line.product.name,
                        "sku": line.product.sku,
                        "unit": line.product.unit,
                        "tracking_mode": line.tracking_mode,
                        "quantity_received": line.quantity_received,
                        "quantity_remaining": line.quantity_remaining,
                    }
                )
            groups.append(
                {
                    "group_id": str(group.id),
                    "code": group.code,
                    "name": group.name,
                    "declared_quantity": group.quantity,
                    "unit": group.unit,
                    "products": products,
                }
            )
        batches.append(
            {
                "batch_id": str(batch.id),
                "code": batch.code,
                "name": batch.name,
                "groups": groups,
            }
        )

    ungrouped_products = [
        {
            "stock_line_id": str(line.id),
            "stock_line_reference": line.reference,
            "product_id": str(line.product_id),
            "name": line.product.name,
            "sku": line.product.sku,
            "unit": line.product.unit,
            "tracking_mode": line.tracking_mode,
            "quantity_received": line.quantity_received,
            "quantity_remaining": line.quantity_remaining,
        }
        for line in receipt.lines.all()
        if line.id not in grouped_line_ids
    ]

    return {
        "found": True,
        "receipt_id": str(receipt.id),
        "reference": receipt.reference,
        "status": receipt.status,
        "received_at": receipt.received_at.isoformat() if receipt.received_at else None,
        "batches": batches,
        "ungrouped_products": ungrouped_products,
    }
