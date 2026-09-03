import re

from common.localization import SUPPORTED_COUNTRIES
from rest_framework import serializers


def normalize_phone_number(*, country_code: str, phone_number: str) -> str:
    country_code = country_code.strip().upper()
    rule = SUPPORTED_COUNTRIES.get(country_code)
    if rule is None:
        raise serializers.ValidationError(
            {"country_code": "Select a supported country."}
        )

    normalized = re.sub(r"[\s\-()]", "", phone_number.strip())
    calling_code = rule["calling_code"]

    if normalized.startswith("+"):
        expected_prefix = f"+{calling_code}"
        if not normalized.startswith(expected_prefix):
            raise serializers.ValidationError(
                {
                    "phone_number": (
                        "The phone number does not match the selected country."
                    )
                }
            )
        national_number = normalized[len(expected_prefix) :]
    elif normalized.startswith(calling_code):
        national_number = normalized[len(calling_code) :]
    elif normalized.startswith("0"):
        national_number = normalized[1:]
    else:
        national_number = normalized

    if not re.fullmatch(rule["national_pattern"], national_number):
        raise serializers.ValidationError(
            {
                "phone_number": (
                    f"Enter a valid phone number for {rule['name']}."
                )
            }
        )

    return f"+{calling_code}{national_number}"


def normalize_e164_phone_number(phone_number: str) -> str:
    normalized = re.sub(r"[\s\-()]", "", phone_number.strip())
    if not re.fullmatch(r"\+[1-9]\d{7,14}", normalized):
        raise serializers.ValidationError(
            "Enter the phone number in international format, for example +255712345678."
        )
    return normalized
