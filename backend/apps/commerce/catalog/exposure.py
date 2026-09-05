from collections import defaultdict
from decimal import Decimal

from django.db.models import Q

from ..inventory.models import TrackedUnit
from .models import Product


COMMERCE_SEARCHABLE_PRODUCT_FIELDS = (
    "name",
    "sku",
    "barcode",
    "brand",
    "variant",
    "group",
)
COMMERCE_SEARCH_FILTERS = (
    "tracking_mode",
    "availability",
    "is_active",
    "unit",
    "brand",
)
PUBLIC_TRACKED_UNIT_FIELDS = (
    "model_name",
    "brand",
    "color",
    "capacity",
    "condition",
)


def _decimal_text(value):
    number = Decimal(value or 0)
    if number == number.to_integral_value():
        return format(number.quantize(Decimal("1")), "f")
    return format(number.normalize(), "f")


def _tracked_units(product):
    cache = getattr(product, "_prefetched_objects_cache", {})
    cached = cache.get("tracked_units")
    if cached is not None:
        return list(cached)
    return list(product.tracked_units.all())


def sku_inventory_state(product):
    """Return the canonical current inventory state for one Commerce SKU.

    Product.tracking_mode is authoritative. Receipt and StockBatch tracking modes are
    provenance details and are intentionally not used to reinterpret the SKU.
    """

    units = _tracked_units(product) if product.tracking_mode == Product.TrackingMode.INDIVIDUAL else []
    if product.tracking_mode == Product.TrackingMode.INDIVIDUAL:
        available_quantity = Decimal(
            sum(1 for unit in units if unit.status == TrackedUnit.Status.AVAILABLE)
        )
    else:
        available_quantity = max(Decimal("0"), Decimal(product.current_quantity or 0))

    if not product.is_active or available_quantity <= 0:
        availability = "out_of_stock"
    elif (
        product.low_stock_threshold > 0
        and available_quantity <= product.low_stock_threshold
    ):
        availability = "low_stock"
    else:
        availability = "in_stock"

    return {
        "tracking_mode": product.tracking_mode,
        "availability": availability,
        "available_quantity": available_quantity,
        "tracked_units": units,
    }


def _base_product_view(product, state):
    return {
        "product_id": str(product.id),
        "name": product.name,
        "sku": product.sku,
        "brand": product.brand,
        "variant": product.variant,
        "group": product.group,
        "unit": product.unit,
        "tracking_mode": state["tracking_mode"],
        "availability": state["availability"],
        "is_active": product.is_active,
    }


def project_product_for_agent(product):
    """Operational product view for authorized Intelligence consumers.

    This intentionally excludes supplier, acquisition-cost and receipt provenance.
    More sensitive tools can expose those fields separately under their own permission.
    """

    state = sku_inventory_state(product)
    payload = _base_product_view(product, state)
    payload.update(
        {
            "barcode": product.barcode,
            "selling_price": str(product.selling_price) if product.selling_price is not None else None,
            "current_quantity": _decimal_text(state["available_quantity"]),
            "low_stock_threshold": _decimal_text(product.low_stock_threshold),
        }
    )
    if product.tracking_mode == Product.TrackingMode.INDIVIDUAL:
        payload["tracked_unit_counts"] = {
            "available": sum(
                1
                for unit in state["tracked_units"]
                if unit.status == TrackedUnit.Status.AVAILABLE
            ),
            "sold": sum(
                1
                for unit in state["tracked_units"]
                if unit.status == TrackedUnit.Status.SOLD
            ),
            "damaged": sum(
                1
                for unit in state["tracked_units"]
                if unit.status == TrackedUnit.Status.DAMAGED
            ),
            "lost": sum(
                1
                for unit in state["tracked_units"]
                if unit.status == TrackedUnit.Status.LOST
            ),
        }
    return payload


def project_product_for_search(product):
    """Stable internal search result for one Commerce SKU."""

    state = sku_inventory_state(product)
    payload = _base_product_view(product, state)
    payload.update(
        {
            "barcode": product.barcode,
            "current_quantity": _decimal_text(state["available_quantity"]),
        }
    )
    return payload


def project_product_for_website(product):
    """Public-safe Commerce projection for Website/Storefront consumers.

    Exact stock counts, receipt provenance, acquisition costs, IMEI, serial numbers and
    internal identifiers are deliberately excluded. Individual-unit records are reduced
    to customer-facing attributes and availability only.
    """

    state = sku_inventory_state(product)
    payload = {
        "product_id": str(product.id),
        "name": product.name,
        "sku": product.sku,
        "brand": product.brand,
        "variant": product.variant,
        "unit": product.unit,
        "tracking_mode": state["tracking_mode"],
        "availability": state["availability"],
        "selling_price": str(product.selling_price) if product.selling_price is not None else None,
        "offers": [],
    }

    if product.tracking_mode != Product.TrackingMode.INDIVIDUAL:
        return payload

    grouped = defaultdict(lambda: {"available": False, "attributes": {}})
    for unit in state["tracked_units"]:
        attributes = {
            field: str(getattr(unit, field, "") or "").strip()
            for field in PUBLIC_TRACKED_UNIT_FIELDS
            if str(getattr(unit, field, "") or "").strip()
        }
        signature = tuple((field, attributes.get(field, "")) for field in PUBLIC_TRACKED_UNIT_FIELDS)
        offer = grouped[signature]
        offer["attributes"] = attributes
        if unit.status == TrackedUnit.Status.AVAILABLE:
            offer["available"] = True

    payload["offers"] = [
        {
            "attributes": offer["attributes"],
            "availability": "in_stock" if offer["available"] and product.is_active else "out_of_stock",
        }
        for _signature, offer in sorted(grouped.items(), key=lambda item: item[0])
    ]
    return payload


def project_product_for_summary(product):
    """Stable product summary contract for copy/share/print formatting."""

    state = sku_inventory_state(product)
    payload = _base_product_view(product, state)
    payload.update(
        {
            "current_quantity": _decimal_text(state["available_quantity"]),
            "selling_price": str(product.selling_price) if product.selling_price is not None else None,
        }
    )
    return payload


def project_product_for_analytics(product):
    """Simple Commerce-local SKU metrics for module analytics composition."""

    state = sku_inventory_state(product)
    quantity = state["available_quantity"]
    selling_price = product.selling_price
    return {
        "product_id": str(product.id),
        "sku": product.sku,
        "tracking_mode": state["tracking_mode"],
        "availability": state["availability"],
        "available_quantity": _decimal_text(quantity),
        "selling_price": str(selling_price) if selling_price is not None else None,
        "potential_retail_value": (
            str((quantity * selling_price).quantize(Decimal("0.01")))
            if selling_price is not None
            else None
        ),
    }


def search_catalog_products(*, business, query, limit=8, include_inactive=False):
    """Apply the canonical Commerce product-search parameters.

    Global workspace search and Intelligence should call this selector rather than
    independently choosing Product fields.
    """

    cleaned = str(query or "").strip()
    if not cleaned:
        return []

    products = Product.objects.filter(business=business)
    if not include_inactive:
        products = products.filter(is_active=True)
    products = products.filter(
        Q(name__icontains=cleaned)
        | Q(sku__icontains=cleaned)
        | Q(barcode__icontains=cleaned)
        | Q(brand__icontains=cleaned)
        | Q(variant__icontains=cleaned)
        | Q(group__icontains=cleaned)
    ).order_by("name", "sku", "id")[:limit]
    return [project_product_for_search(product) for product in products]
