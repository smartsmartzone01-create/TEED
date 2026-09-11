import json
from hashlib import sha256

from apps.commerce.catalog.exposure import project_product_for_website

from .models import WebsiteVariant

PUBLIC_UNIT_OPTION_FIELDS = (
    ("model", "model_name", {"en": "Model", "sw": "Modeli"}),
    ("brand", "brand", {"en": "Brand", "sw": "Chapa"}),
    ("color", "color", {"en": "Color", "sw": "Rangi"}),
    ("capacity", "capacity", {"en": "Capacity", "sw": "Uwezo"}),
    ("condition", "condition", {"en": "Condition", "sw": "Hali"}),
)
AVAILABILITY_PRIORITY = {
    WebsiteVariant.Availability.OUT_OF_STOCK: 0,
    WebsiteVariant.Availability.LOW_STOCK: 1,
    WebsiteVariant.Availability.IN_STOCK: 2,
}


def _normalized_options(value):
    if not isinstance(value, dict):
        return {}
    return {
        str(key): str(option_value).strip()
        for key, option_value in value.items()
        if str(key).strip() and str(option_value).strip()
    }


def _active_unit_fields(variant, commerce_offers):
    active = []
    for option_id, attribute, labels in PUBLIC_UNIT_OPTION_FIELDS:
        values = [
            str((offer.get("attributes") or {}).get(attribute) or "").strip()
            for offer in commerce_offers
        ]
        if values and all(values):
            active.append((option_id, attribute, labels))
    return active


def _option_payload(option_id, labels, values):
    seen = set()
    payload_values = []
    for value in values:
        cleaned = str(value or "").strip()
        if not cleaned or cleaned in seen:
            continue
        seen.add(cleaned)
        payload_values.append(
            {
                "value": cleaned,
                "label": {"en": cleaned, "sw": cleaned},
            }
        )
    return {
        "id": option_id,
        "name": labels,
        "values": payload_values,
    }


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
    commerce,
    options,
    commerce_availability=None,
):
    price = variant.resolved_price()

    if (
        commerce is not None
        and variant.availability_source == WebsiteVariant.Source.COMMERCE
    ):
        availability = commerce_availability or commerce["availability"]
    else:
        availability = variant.website_availability

    if commerce is not None:
        sku = commerce["sku"] or variant.sku or str(variant.id)
        tracking_mode = commerce["tracking_mode"]
    else:
        sku = variant.sku or str(variant.id)
        tracking_mode = None

    payload = {
        "id": _offer_id(variant, options, tracking_mode),
        "websiteVariantId": str(variant.id),
        "sku": sku,
        "options": options,
        "price": (
            {
                "amount": format(price, "f"),
                "currency": variant.currency.upper(),
            }
            if price is not None
            else None
        ),
        "availability": availability,
    }

    if commerce is not None:
        payload["commerceProductId"] = commerce["product_id"]
        payload["trackingMode"] = tracking_mode

    image_url = variant.resolved_image_url()
    if image_url:
        payload["imageUrl"] = image_url

    return payload


def _deduplicate_offers(offers):
    merged = {}
    for offer in offers:
        signature = json.dumps(offer["options"], sort_keys=True, separators=(",", ":"))
        current = merged.get(signature)
        if current is None or AVAILABILITY_PRIORITY[offer["availability"]] > (
            AVAILABILITY_PRIORITY[current["availability"]]
        ):
            merged[signature] = offer
    return list(merged.values())


def resolve_storefront_variant(variant: WebsiteVariant):
    """Resolve one Website variant through the Commerce public-safe projection."""

    product = variant.valid_commerce_product()
    base_options = _normalized_options(variant.options)

    if product is None:
        offer = _offer_payload(
            variant=variant,
            commerce=None,
            options=base_options,
        )
        return [], [offer]

    commerce = project_product_for_website(product)
    commerce_offers = commerce.get("offers") or []

    if commerce["tracking_mode"] != "individual" or not commerce_offers:
        offer = _offer_payload(
            variant=variant,
            commerce=commerce,
            options=base_options,
            commerce_availability=commerce["availability"],
        )
        return [], [offer]

    active_fields = [
        field
        for field in _active_unit_fields(variant, commerce_offers)
        if field[0] not in base_options
    ]
    derived_options = [
        _option_payload(
            option_id,
            labels,
            [
                (offer.get("attributes") or {}).get(attribute, "")
                for offer in commerce_offers
            ],
        )
        for option_id, attribute, labels in active_fields
    ]

    offers = []
    for commerce_offer in commerce_offers:
        attributes = commerce_offer.get("attributes") or {}
        options = dict(base_options)
        for option_id, attribute, _labels in active_fields:
            options[option_id] = str(attributes[attribute]).strip()

        offer = _offer_payload(
            variant=variant,
            commerce=commerce,
            options=options,
            commerce_availability=commerce_offer["availability"],
        )
        offers.append(offer)

    return derived_options, _deduplicate_offers(offers)
