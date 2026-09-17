from django.db.models.signals import post_save
from django.dispatch import receiver

from .models import WebsiteListing, WebsiteVariant

OPTION_LABEL_ACRONYMS = {
    "cpu": "CPU",
    "gpu": "GPU",
    "hdd": "HDD",
    "ram": "RAM",
    "rom": "ROM",
    "sku": "SKU",
    "ssd": "SSD",
    "usb": "USB",
    "vin": "VIN",
}


def _localized(value, fallback):
    source = value if isinstance(value, dict) else {}
    return {
        "en": str(source.get("en") or fallback),
        "sw": str(source.get("sw") or source.get("en") or fallback),
    }


def _option_label(option_id):
    words = str(option_id or "").replace("-", "_").split("_")
    return " ".join(
        OPTION_LABEL_ACRONYMS.get(word.lower(), word.capitalize())
        for word in words
        if word
    ).strip() or str(option_id)


def _active_variant_options(listing):
    option_values = {}
    option_order = []
    variants = WebsiteVariant.objects.filter(listing=listing).order_by(
        "sort_order",
        "created_at",
        "id",
    )
    for raw_options in variants.values_list("options", flat=True):
        if not isinstance(raw_options, dict):
            continue
        for raw_option_id, raw_value in raw_options.items():
            option_id = str(raw_option_id or "").strip()
            value = str(raw_value or "").strip()
            if not option_id or not value:
                continue
            if option_id not in option_values:
                option_values[option_id] = []
                option_order.append(option_id)
            if value not in option_values[option_id]:
                option_values[option_id].append(value)
    return option_order, option_values


def _existing_option_map(listing):
    option_map = {}
    option_order = []
    raw_options = listing.options if isinstance(listing.options, list) else []
    for raw_option in raw_options:
        if not isinstance(raw_option, dict):
            continue
        option_id = str(raw_option.get("id") or "").strip()
        if not option_id or option_id in option_map:
            continue
        option_map[option_id] = raw_option
        option_order.append(option_id)
    return option_order, option_map


def _value_payload(value, existing_option):
    existing_values = existing_option.get("values") if isinstance(existing_option, dict) else []
    if isinstance(existing_values, list):
        for existing_value in existing_values:
            if not isinstance(existing_value, dict):
                continue
            if str(existing_value.get("value") or "").strip() != value:
                continue
            payload = dict(existing_value)
            payload["value"] = value
            payload["label"] = _localized(existing_value.get("label"), value)
            return payload
    return {"value": value, "label": {"en": value, "sw": value}}


def _sync_listing_options(listing):
    active_order, active_values = _active_variant_options(listing)
    existing_order, existing_map = _existing_option_map(listing)
    option_order = [option_id for option_id in existing_order if option_id in active_values]
    option_order.extend(option_id for option_id in active_order if option_id not in option_order)

    next_options = []
    for option_id in option_order:
        existing = existing_map.get(option_id, {})
        fallback_name = _option_label(option_id)
        payload = {
            key: value
            for key, value in existing.items()
            if key not in {"id", "name", "values"}
        } if isinstance(existing, dict) else {}
        payload.update(
            {
                "id": option_id,
                "name": _localized(existing.get("name") if isinstance(existing, dict) else None, fallback_name),
                "values": [
                    _value_payload(value, existing)
                    for value in active_values[option_id]
                ],
            }
        )
        next_options.append(payload)

    if listing.options == next_options:
        return
    listing.options = next_options
    listing.save(update_fields=["options", "updated_at"])


@receiver(post_save, sender=WebsiteVariant, dispatch_uid="website_sync_listing_options_from_variant")
def sync_listing_options_from_variant(sender, instance, raw=False, **kwargs):
    if raw:
        return
    listing = WebsiteListing.objects.filter(id=instance.listing_id).first()
    if listing is not None:
        _sync_listing_options(listing)
