from zoneinfo import ZoneInfo, ZoneInfoNotFoundError

from rest_framework import serializers

from .models import UserPreference


class UserPreferenceSerializer(serializers.ModelSerializer):
    class Meta:
        model = UserPreference
        fields = [
            "language",
            "appearance",
            "timezone",
            "date_format",
            "time_format",
            "reduced_motion",
            "updated_at",
        ]
        read_only_fields = ["updated_at"]

    def validate_timezone(self, value):
        try:
            ZoneInfo(value)
        except (ZoneInfoNotFoundError, ValueError):
            raise serializers.ValidationError(
                "Use a valid IANA timezone identifier.",
                code="timezone_invalid",
            )
        return value

    def validate(self, attrs):
        if self.partial and not attrs:
            raise serializers.ValidationError(
                "Provide at least one preference to update.",
                code="preferences_update_empty",
            )
        return attrs
