from common.localization import SUPPORTED_COUNTRY_CHOICES
from rest_framework import serializers

from .phone import normalize_phone_number


class OnboardingSerializer(serializers.Serializer):
    username = serializers.RegexField(
        regex=r"^[A-Za-z0-9_]{3,30}$",
        error_messages={
            "invalid": "Username must contain 3 to 30 letters, numbers, or underscores.",
        },
    )
    country_code = serializers.ChoiceField(choices=SUPPORTED_COUNTRY_CHOICES)
    phone_number = serializers.CharField(max_length=24)

    def validate_username(self, value):
        return value.strip().lower()

    def validate(self, attrs):
        attrs["country_code"] = attrs["country_code"].upper()
        attrs["phone_number"] = normalize_phone_number(
            country_code=attrs["country_code"],
            phone_number=attrs["phone_number"],
        )
        return attrs
