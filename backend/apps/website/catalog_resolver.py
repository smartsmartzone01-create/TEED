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


def _active_unit_fields(variant, units, *, include_unspecified=False):
    declared = _declared_option_ids(variant)
    active = []
    for option_id, attribute, labels in PUBLIC_UNIT_OPTION_FIELDS:
        nonempty_values = {
            _unit_value(unit, attribute)
            for unit in units
            if _unit_value(unit, attribute)
        }
        if (
            option_id in declared
            or len(nonempty_values) > 1
            or (include_unspecified and nonempty_values)
        ):
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


def _positive_quantity(value):
    return max(Decimal("0"), Decimal(value))


def _commerce_availability(product, available_quantity):
    available = Decimal(available_quantity)
    if not product.is_active or available <= 0:
        return WebsiteVariant.Availability.OUT_OF_STOCK
    if product.low_stock_threshold > 0 and available <= product.low_stock_threshold:
        return WebsiteVariant.Availability.LOW_STOCK
    return WebsiteVariant.Availability.IN_STOCK


def _offer_id(variant, options, tracking_mode=None):
    if not options and tracking_mode is None:
        return str(variant.id)
    signature = json.dumps(
        {
            "options": options,
            "trackingMode": tracking_mode or "",
        },
        sort_keys=True,
        separators=(",", ":"),
    )
    digest = sha256(signature.encode("utf-8")).hexdigest()[:12]
    return f"{variant.id}:{digest}"


def _offer_payload(
    *,
    variant,
    product,
    options,
    available_quantity=None,
    tracking_mode=None,
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
        "id": _offer_id(variant, options, tracking_mode),
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
        payload["trackingMode"] = tracking_mode or product.tracking_mode
        if sellable_quantity is not None:
            payload["availableQuantity"] = _format_quantity(sellable_quantity)

    if variant.image_url:
        payload["imageUrl"] = variant.image_url

    return payload


def _generic_options(base_options, active_fields):
    options = dict(base_options)
    for option_id, _attribute, _labels in active_fields:
        options.setdefault(option_id, UNSPECIFIED_VALUE)
    return options


def _available_unit_ids(individual_lines):
    available_ids = set()
    for line in individual_lines:
        remaining_slots = int(_positive_quantity(line.quantity_remaining))
        if remaining_slots <= 0:
            continue

        candidates = [
            unit
            for unit in line.tracked_units.all()
            if unit.status == TrackedUnit.Status.AVAILABLE
        ]
        for unit in candidates[:remaining_slots]:
            available_ids.add(unit.id)
    return available_ids


def _resolve_stock_lines(variant, product, stock_lines):
    base_options = _normalized_options(variant.options)
    quantity_lines = [
        line
        for line in stock_lines
        if line.tracking_mode == Product.TrackingMode.QUANTITY
    ]
    individual_lines = [
        line
        for line in stock_lines
        if line.tracking_mode == Product.TrackingMode.INDIVIDUAL
    ]

    units = [
        unit
        for line in individual_lines
        for unit in line.tracked_units.all()
    ]
    unresolved_individual_lines = [
        line for line in individual_lines if not list(line.tracked_units.all())
    ]
    has_generic_stock = bool(quantity_lines or unresolved_individual_lines)
    active_fields = _active_unit_fields(
        variant,
        units,
        include_unspecified=has_generic_stock,
    )

    derived_options = []
    for option_id, attribute, labels in active_fields:
        values = [_unit_value(unit, attribute) for unit in units]
        if has_generic_stock:
            values.append("")
        derived_options.append(_option_payload(option_id, labels, values))

    offers = []

    if quantity_lines:
        quantity_available = sum(
            (_positive_quantity(line.quantity_remaining) for line in quantity_lines),
            Decimal("0"),
        )
        offer = _offer_payload(
            variant=variant,
            product=product,
            options=_generic_options(base_options, active_fields),
            available_quantity=quantity_available,
            tracking_mode=Product.TrackingMode.QUANTITY,
        )
        if offer is not None:
            offers.append(offer)

    if units:
        available_ids = _available_unit_ids(individual_lines)
        grouped_units = defaultdict(list)
        grouped_options = {}
        for unit in units:
            options = dict(base_options)
            for option_id, attribute, _labels in active_fields:
                options[option_id] = _public_value(_unit_value(unit, attribute))
            signature = json.dumps(options, sort_keys=True, separators=(",", ":"))
            grouped_units[signature].append(unit)
            grouped_options[signature] = options

        for signature in sorted(grouped_units):
            grouped = grouped_units[signature]
            available_count = sum(1 for unit in grouped if unit.id in available_ids)
            offer = _offer_payload(
                variant=variant,
                product=product,
                options=grouped_options[signature],
                available_quantity=available_count,
                tracking_mode=Product.TrackingMode.INDIVIDUAL,
            )
            if offer is not None:
                offers.append(offer)

    if unresolved_individual_lines:
        unresolved_available = sum(
            (
                _positive_quantity(line.quantity_remaining)
                for line in unresolved_individual_lines
            ),
            Decimal("0"),
        )
        offer = _offer_payload(
            variant=variant,
            product=product,
            options=_generic_options(base_options, active_fields),
            available_quantity=unresolved_available,
            tracking_mode=Product.TrackingMode.INDIVIDUAL,
        )
        if offer is not None:
            offers.append(offer)

    return derived_options, offers


def resolve_storefront_variant(variant: WebsiteVariant):
    """
    Resolve one Website variant through its SKU-level Commerce Product.

    Commerce groups are intentionally ignored. Each stock line inside the SKU keeps
    its own tracking mode: quantity lines contribute their remaining quantity, while
    individual lines contribute safe customer-facing unit attributes. Mixed SKUs can
    therefore expose both kinds of stock at once. Private identifiers such as IMEI,
    serial number, internal serial, and identifier records never enter this contract.
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

    stock_lines = list(product.stock_batches.all())
    if stock_lines:
        return _resolve_stock_lines(variant, product, stock_lines)

    offer = _offer_payload(
        variant=variant,
        product=product,
        options=base_options,
        available_quantity=product.current_quantity,
        tracking_mode=product.tracking_mode,
    )
    return [], [offer] if offer is not None else []
