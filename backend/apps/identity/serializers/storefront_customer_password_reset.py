from common.localization import SUPPORTED_COUNTRY_CHOICES
from rest_framework import serializers

from .password_reset import PasswordResetConfirmSerializer
from .phone import normalize_phone_number


class StorefrontPasswordResetRequestSerializer(serializers.Serializer):
    channel = serializers.ChoiceField(choices=("email", "phone"))
    email = serializers.EmailField(max_length=254, required=False)
    country_code = serializers.ChoiceField(
        choices=SUPPORTED_COUNTRY_CHOICES,
        required=False,
    )
    phone_number = serializers.CharField(max_length=24, required=False)

    def validate(self, attrs):
        channel = attrs["channel"]
        if channel == "email":
            email = (attrs.get("email") or "").strip().lower()
            if not email:
                raise serializers.ValidationError(
                    {"email": ["Enter your email address."]}
                )
            return {"identifier": email}

        country_code = (attrs.get("country_code") or "").upper()
        phone_number = (attrs.get("phone_number") or "").strip()
        if not country_code or not phone_number:
            raise serializers.ValidationError(
                {"phone_number": ["Enter your phone number."]}
            )
        return {
            "identifier": normalize_phone_number(
                country_code=country_code,
                phone_number=phone_number,
            )
        }


class StorefrontPasswordResetVerifySerializer(
    StorefrontPasswordResetRequestSerializer,
):
    code = serializers.CharField(max_length=16, trim_whitespace=True)

    def validate(self, attrs):
        validated = super().validate(attrs)
        validated["code"] = attrs["code"].strip()
        return validated


class StorefrontPasswordResetConfirmSerializer(PasswordResetConfirmSerializer):
    reset_grant = serializers.CharField(
        write_only=True,
        trim_whitespace=False,
    )
