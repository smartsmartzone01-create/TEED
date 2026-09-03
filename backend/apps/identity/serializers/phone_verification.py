from django.conf import settings
from rest_framework import serializers

from .phone import normalize_e164_phone_number


class PhoneVerificationSerializer(serializers.Serializer):
    phone_number = serializers.CharField(max_length=24)
    code = serializers.RegexField(
        regex=rf"^\d{{{settings.EMAIL_VERIFICATION_CODE_LENGTH}}}$",
        trim_whitespace=True,
        error_messages={"invalid": "Enter a valid numeric verification code."},
    )

    def validate_phone_number(self, value):
        return normalize_e164_phone_number(value)


class PhoneVerificationResendSerializer(serializers.Serializer):
    phone_number = serializers.CharField(max_length=24)

    def validate_phone_number(self, value):
        return normalize_e164_phone_number(value)
