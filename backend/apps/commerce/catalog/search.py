from django.db.models import Q

from .models import Product


def search_available_products(*, business, query, limit=8):
    """Search active catalog products that are currently available to sell."""
    cleaned = str(query or "").strip()
    if not cleaned:
        return []

    products = (
        Product.objects.filter(
            business=business,
            is_active=True,
            current_quantity__gt=0,
        )
        .filter(
            Q(name__icontains=cleaned)
            | Q(sku__icontains=cleaned)
            | Q(barcode__icontains=cleaned)
            | Q(brand__icontains=cleaned)
            | Q(variant__icontains=cleaned)
            | Q(family__name__icontains=cleaned)
        )
        .select_related("family")
        .order_by("name", "sku", "id")[:limit]
    )

    return [
        {
            "type": "available_product",
            "id": str(product.id),
            "reference": product.sku,
            "title": product.name,
            "subtitle": product.family.name
            if product.family_id
            else product.brand or product.variant,
            "status": "available",
            "module": "commerce.catalog",
            "metadata": {
                "sku": product.sku,
                "barcode": product.barcode,
                "family_name": product.family.name if product.family_id else "",
                "brand": product.brand,
                "variant": product.variant,
                "unit": product.unit,
                "tracking_mode": product.tracking_mode,
                "current_quantity": str(product.current_quantity),
                "selling_price": str(product.selling_price)
                if product.selling_price is not None
                else None,
            },
        }
        for product in products
    ]


__all__ = ["search_available_products"]
