import json
from collections import defaultdict
from decimal import Decimal
from hashlib import sha256

from apps.commerce.models import Product, TrackedUnit

from .models import WebsiteVariant


UNSPECIFIED_VALUE = "__unspecified__"
PUBLIC_UNIT_OPTION_FIELDS = (
    ("model", "model_name", {"en": "Model", "sw": "Modeli"}),
    ("brand", "brand", {"en": "Brand", "sw": "Chapa"}),
    ("color", "color", {"en": "Color", "sw": "Rangi"}),
    ("capacity", "capacity", {"en": "Capacity", "sw": "Uwezo"}),
    ("condition", "condition", {"en": "Condition", "sw": "Hali"}),
)


def _normalized_options(value):
    if not isinstance(value, dict):
        return {}
    return {
        str(key): str(option_value).strip()
        for key, option_value in value.items()
        if str(key).strip() and str(option_value).strip()
    }


def _declared_option_ids(variant):
    listing_options = (
        variant.listing.options if isinstance(variant.listing.options, list) else []
    )
    return {
        str(option.get("id") or "").strip()
        for option in listing_options
        if isinstance(option, dict) and str(option.get("id") or "").strip()
    }


def _unit_value(unit, attribute):
    return str(getattr(unit, attribute, "") or "").strip()


def _active_unit_fields(variant, units):
    declared = _declared_option_ids(variant)
    active = []
    for option_id, attribute, labels in PUBLIC_UNIT_OPTION_FIELDS:
        nonempty_values = {
            _unit_value(unit, attribute)
            for unit in units
            if _unit_value(unit, attribute)
        }
        if option_id in declared or len(nonempty_values) > 1:
            active.append((option_id, attribute, labels))
    return active


def _public_value(value):
    return value or UNSPECIFIED_VALUE


def _value_labels(value):
    if value == UNSPECIFIED_VALUE:
        return {"en": "Unspecified", "sw": "Haijabainishwa"}
    return {"en": value, "sw": value}


def _option_payload(option_id, labels, values):
    seen = set()
    payload_values = []
    for value in values:
        public_value = _public_value(value)
        if public_value in seen:
            continue
        seen.add(public_value)
        payload_values.append(
            {
                "value": public_value,
                "label": _value_labels(public_value),
            }
        )
    return {
        "id": option_id,
        "name": labels,
        "values": payload_values,
    }


def _format_quantity(value):
    quantity = Decimal(value)
    if quantity == quantity.to_integral_value():
        return format(quantity.quantize(Decimal("1")), "f")
    return format(quantity.normalize(), "f")


def _commerce_availability(product, available_quantity):
    available = Decimal(available_quantity)
    if not product.is_active or available <= 0:
        return WebsiteVariant.Availability.OUT_OF_STOCK
    if product.low_stock_threshold > 0 and available <= product.low_stock_threshold:
        return WebsiteVariant.Availability.LOW_STOCK
    return WebsiteVariant.Availability.IN_STOCK


def _offer_id(variant, options):
    if not options:
        return str(variant.id)
    signature = json.dumps(options, sort_keys=True, separators=(",", ":"))
    digest = sha256(signature.encode("utf-8")).hexdigest()[:12]
    return f"{variant.id}:{digest}"


def _offer_payload(
    *,
    variant,
    product,
    options,
    available_quantity=None,
):
    price = variant.resolved_price()
    if price is None:
        return None

    if (
        product is not None
        and variant.availability_source == WebsiteVariant.Source.COMMERCE
        and available_quantity is not None
    ):
        sellable_quantity = (
            Decimal(available_quantity) if product.is_active else Decimal("0")
        )
        availability = _commerce_availability(product, sellable_quantity)
    else:
        sellable_quantity = None
        availability = variant.website_availability

    if product is not None:
        sku = product.sku or variant.sku or str(variant.id)
    else:
        sku = variant.sku or str(variant.id)

    payload = {
        "id": _offer_id(variant, options),
        "sku": sku,
        "options": options,
        "price": {
            "amount": format(price, "f"),
            "currency": variant.currency.upper(),
        },
        "availability": availability,
    }

    if product is not None:
        payload["commerceProductId"] = str(product.id)
        payload["trackingMode"] = product.tracking_mode
        if sellable_quantity is not None:
            payload["availableQuantity"] = _format_quantity(sellable_quantity)

    if variant.image_url:
        payload["imageUrl"] = variant.image_url

    return payload


def _resolve_individual_variant(variant, product):
    units = list(product.tracked_units.all())
    base_options = _normalized_options(variant.options)

    if not units:
        offer = _offer_payload(
            variant=variant,
            product=product,
            options=base_options,
            available_quantity=product.current_quantity,
        )
        return [], [offer] if offer is not None else []

    active_fields = _active_unit_fields(variant, units)
    derived_options = [
        _option_payload(
            option_id,
            labels,
            [_unit_value(unit, attribute) for unit in units],
        )
        for option_id, attribute, labels in active_fields
    ]

    grouped_units = defaultdict(list)
    grouped_options = {}
    for unit in units:
        options = dict(base_options)
        for option_id, attribute, _labels in active_fields:
            options[option_id] = _public_value(_unit_value(unit, attribute))
        signature = json.dumps(options, sort_keys=True, separators=(",", ":"))
        grouped_units[signature].append(unit)
        grouped_options[signature] = options

    offers = []
    for signature in sorted(grouped_units):
        grouped = grouped_units[signature]
        available_count = sum(
            1 for unit in grouped if unit.status == TrackedUnit.Status.AVAILABLE
        )
        offer = _offer_payload(
            variant=variant,
            product=product,
            options=grouped_options[signature],
            available_quantity=available_count,
        )
        if offer is not None:
            offers.append(offer)

    return derived_options, offers


def resolve_storefront_variant(variant: WebsiteVariant):
    """
    Resolve one Website variant against a SKU-level Commerce Product.

    Commerce groups are intentionally ignored. Quantity-tracked SKUs expose their
    sellable quantity directly; individually tracked SKUs are aggregated from safe
    customer-facing unit attributes. Private identifiers such as IMEI, serial
    number, internal serial, and identifier records are never part of this contract.
    """

    product = variant.valid_commerce_product()
    base_options = _normalized_options(variant.options)

    if product is None:
        offer = _offer_payload(
            variant=variant,
            product=None,
            options=base_options,
        )
        return [], [offer] if offer is not None else []

    if product.tracking_mode == Product.TrackingMode.INDIVIDUAL:
        return _resolve_individual_variant(variant, product)

    offer = _offer_payload(
        variant=variant,
        product=product,
        options=base_options,
        available_quantity=product.current_quantity,
    )
    return [], [offer] if offer is not None else []
