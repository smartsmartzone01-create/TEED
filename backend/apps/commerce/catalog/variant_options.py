import json
import re
import unicodedata

from rest_framework.exceptions import ValidationError

MAX_VARIANT_OPTIONS = 12


def variant_option_key(value):
    text = unicodedata.normalize("NFKD", str(value or ""))
    text = "".join(character for character in text if not unicodedata.combining(character))
    text = re.sub(r"[^a-zA-Z0-9]+", "_", text).strip("_").lower()
    return text[:48]


def normalize_variant_options(value):
    """Return a stable, validated list of sellable SKU option values.

    Product.variant remains a human-readable compatibility field. This structure is the
    machine-readable SKU configuration for new catalog identities.
    """

    if value in (None, "", []):
        return []
    if not isinstance(value, list):
        raise ValidationError({"variant_options": ["Enter product details as a list."]})
    if len(value) > MAX_VARIANT_OPTIONS:
        raise ValidationError(
            {"variant_options": [f"Use at most {MAX_VARIANT_OPTIONS} product details."]}
        )

    normalized = []
    seen = set()
    for index, raw_option in enumerate(value, start=1):
        if not isinstance(raw_option, dict):
            raise ValidationError(
                {"variant_options": [f"Product detail {index} must be an object."]}
            )
        label = str(raw_option.get("label") or "").strip()
        option_value = str(raw_option.get("value") or "").strip()
        key = variant_option_key(raw_option.get("key") or label)
        if not label or not option_value or not key:
            raise ValidationError(
                {
                    "variant_options": [
                        f"Product detail {index} needs a type and a value."
                    ]
                }
            )
        if key in seen:
            raise ValidationError(
                {"variant_options": [f"Product detail '{label}' is entered twice."]}
            )
        seen.add(key)
        normalized.append({"key": key, "label": label[:80], "value": option_value[:120]})
    return normalized


def variant_option_signature(value):
    normalized = normalize_variant_options(value)
    return tuple(
        sorted(
            (option["key"].casefold(), option["value"].casefold())
            for option in normalized
        )
    )


def variant_option_values(value):
    return {
        option["key"]: option["value"]
        for option in normalize_variant_options(value)
    }


def variant_display_name(value):
    return " · ".join(
        option["value"] for option in normalize_variant_options(value)
    )


def variant_option_fingerprint(value):
    signature = variant_option_signature(value)
    return json.dumps(signature, separators=(",", ":"), ensure_ascii=False)
