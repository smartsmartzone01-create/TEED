from common.localization import SUPPORTED_COUNTRY_CHOICES
from rest_framework import serializers

from .authentication import EmailLoginSerializer, PhoneLoginSerializer
from .phone import normalize_phone_number
from .registration import EmailRegistrationSerializer, PhoneRegistrationSerializer


class StorefrontEmailRegistrationSerializer(EmailRegistrationSerializer):
    first_name = serializers.CharField(max_length=150, required=False, allow_blank=True)
    last_name = serializers.CharField(max_length=150, required=False, allow_blank=True)


class StorefrontPhoneRegistrationSerializer(PhoneRegistrationSerializer):
    first_name = serializers.CharField(max_length=150, required=False, allow_blank=True)
    last_name = serializers.CharField(max_length=150, required=False, allow_blank=True)


class StorefrontEmailLoginSerializer(EmailLoginSerializer):
    pass


class StorefrontPhoneLoginSerializer(PhoneLoginSerializer):
    pass


class StorefrontEmailVerificationSerializer(serializers.Serializer):
    email = serializers.EmailField(max_length=254)
    code = serializers.CharField(max_length=16, trim_whitespace=True)

    def validate_email(self, value):
        return value.strip().lower()


class StorefrontPhoneVerificationSerializer(serializers.Serializer):
    country_code = serializers.ChoiceField(choices=SUPPORTED_COUNTRY_CHOICES)
    phone_number = serializers.CharField(max_length=24)
    code = serializers.CharField(max_length=16, trim_whitespace=True)

    def validate(self, attrs):
        attrs["country_code"] = attrs["country_code"].upper()
        attrs["phone_number"] = normalize_phone_number(
            country_code=attrs["country_code"],
            phone_number=attrs["phone_number"],
        )
        return attrs


class StorefrontRefreshCredentialSerializer(serializers.Serializer):
    refresh = serializers.CharField(trim_whitespace=False, write_only=True)
