from django.db.models import F

from ..catalog.models import Product
from .models import InventoryMovement


def _item_payload(product):
    return {
        "product_id": str(product.id),
        "name": product.name,
        "sku": product.sku,
        "unit": product.unit,
        "current_quantity": product.current_quantity,
        "low_stock_threshold": product.low_stock_threshold,
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
