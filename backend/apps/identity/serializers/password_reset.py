from django.conf import settings
from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError
from rest_framework import serializers

from .phone import normalize_e164_phone_number


def _normalize_identifier(value: str) -> str:
    value = value.strip()
    if "@" in value:
        field = serializers.EmailField(max_length=254)
        return field.run_validation(value).strip().lower()
    return normalize_e164_phone_number(value)


class PasswordResetRequestSerializer(serializers.Serializer):
    identifier = serializers.CharField(max_length=254, required=False)
    email = serializers.EmailField(max_length=254, required=False, write_only=True)

    def validate(self, attrs):
        value = attrs.get("identifier") or attrs.get("email")
        if not value:
            raise serializers.ValidationError(
                {"identifier": ["Enter your email address or phone number."]}
            )
        return {"identifier": _normalize_identifier(value)}


class PasswordResetVerifySerializer(serializers.Serializer):
    identifier = serializers.CharField(max_length=254, required=False)
    email = serializers.EmailField(max_length=254, required=False, write_only=True)
    code = serializers.RegexField(
        regex=rf"^\d{{{settings.EMAIL_VERIFICATION_CODE_LENGTH}}}$",
        trim_whitespace=True,
        error_messages={"invalid": "Enter a valid six-digit reset code."},
    )

    def validate(self, attrs):
        value = attrs.get("identifier") or attrs.get("email")
        if not value:
            raise serializers.ValidationError(
                {"identifier": ["Enter your email address or phone number."]}
            )
        return {
            "identifier": _normalize_identifier(value),
            "code": attrs["code"],
        }


class PasswordResetConfirmSerializer(serializers.Serializer):
    new_password = serializers.CharField(
        write_only=True,
        trim_whitespace=False,
        style={"input_type": "password"},
    )
    new_password_confirm = serializers.CharField(
        write_only=True,
        trim_whitespace=False,
        style={"input_type": "password"},
    )

    def validate(self, attrs):
        if attrs["new_password"] != attrs["new_password_confirm"]:
            raise serializers.ValidationError(
                {"new_password_confirm": ["The passwords do not match."]}
            )
        try:
            validate_password(attrs["new_password"])
        except ValidationError as exc:
            raise serializers.ValidationError(
                {"new_password": list(exc.messages)}
            ) from exc
        return attrs
