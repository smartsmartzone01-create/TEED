from rest_framework import serializers

from ..models import User


class SessionActionSerializer(serializers.Serializer):
    """Empty request contract for cookie-backed session actions."""


class CurrentUserSerializer(serializers.ModelSerializer):
    is_onboarding_complete = serializers.BooleanField(
        read_only=True,
    )

    class Meta:
        model = User
        fields = [
            "id",
            "email",
            "username",
            "phone_number",
            "country_code",
            "first_name",
            "last_name",
            "is_email_verified",
            "is_phone_verified",
            "is_onboarding_complete",
        ]
        read_only_fields = fields
