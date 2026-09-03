from common.localization import SUPPORTED_COUNTRY_CHOICES
from rest_framework import serializers

from .phone import normalize_phone_number


class EmailLoginSerializer(serializers.Serializer):
    email = serializers.EmailField(max_length=254)
    password = serializers.CharField(
        write_only=True,
        trim_whitespace=False,
        style={"input_type": "password"},
    )

    def validate_email(self, value):
        return value.strip().lower()


class PhoneLoginSerializer(serializers.Serializer):
    country_code = serializers.ChoiceField(choices=SUPPORTED_COUNTRY_CHOICES)
    phone_number = serializers.CharField(max_length=24)
    password = serializers.CharField(
        write_only=True,
        trim_whitespace=False,
        style={"input_type": "password"},
    )

    def validate(self, attrs):
        attrs["country_code"] = attrs["country_code"].upper()
        attrs["phone_number"] = normalize_phone_number(
            country_code=attrs["country_code"],
            phone_number=attrs["phone_number"],
        )
        return attrs


class GoogleAuthenticationSerializer(serializers.Serializer):
    credential = serializers.CharField(
        max_length=8192,
        trim_whitespace=True,
    )
