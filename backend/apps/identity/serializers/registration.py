from common.localization import SUPPORTED_COUNTRY_CHOICES
from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError
from rest_framework import serializers

from .phone import normalize_phone_number


def _password_validation_details(exc):
    details = []
    for error in exc.error_list:
        message = error.message
        if error.params:
            message %= error.params
        details.append(
            serializers.ErrorDetail(message, code=error.code or "invalid")
        )
    return details


def _validate_password(value):
    try:
        validate_password(value)
    except ValidationError as exc:
        raise serializers.ValidationError(
            _password_validation_details(exc)
        ) from exc
    return value


class EmailRegistrationSerializer(serializers.Serializer):
    email = serializers.EmailField(max_length=254)
    password = serializers.CharField(
        write_only=True,
        trim_whitespace=False,
        style={"input_type": "password"},
    )

    def validate_email(self, value):
        return value.strip().lower()

    def validate_password(self, value):
        return _validate_password(value)


class PhoneRegistrationSerializer(serializers.Serializer):
    country_code = serializers.ChoiceField(choices=SUPPORTED_COUNTRY_CHOICES)
    phone_number = serializers.CharField(max_length=24)
    password = serializers.CharField(
        write_only=True,
        trim_whitespace=False,
        style={"input_type": "password"},
    )

    def validate_password(self, value):
        return _validate_password(value)

    def validate(self, attrs):
        attrs["country_code"] = attrs["country_code"].upper()
        attrs["phone_number"] = normalize_phone_number(
            country_code=attrs["country_code"],
            phone_number=attrs["phone_number"],
        )
        return attrs
