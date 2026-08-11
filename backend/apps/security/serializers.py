from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError as DjangoValidationError
from rest_framework import serializers


class PasswordChangeSerializer(serializers.Serializer):
    current_password = serializers.CharField(trim_whitespace=False, write_only=True)
    new_password = serializers.CharField(trim_whitespace=False, write_only=True)
    confirm_password = serializers.CharField(trim_whitespace=False, write_only=True)

    def validate(self, attrs):
        user = self.context["request"].user
        if not user.check_password(attrs["current_password"]):
            raise serializers.ValidationError(
                {
                    "current_password": [
                        {
                            "code": "current_password_invalid",
                            "message": "The current password is incorrect.",
                        }
                    ]
                }
            )
        if attrs["new_password"] != attrs["confirm_password"]:
            raise serializers.ValidationError(
                {
                    "confirm_password": [
                        {
                            "code": "password_confirmation_mismatch",
                            "message": "The passwords do not match.",
                        }
                    ]
                }
            )
        if user.check_password(attrs["new_password"]):
            raise serializers.ValidationError(
                {
                    "new_password": [
                        {
                            "code": "password_unchanged",
                            "message": "Choose a password different from your current password.",
                        }
                    ]
                }
            )
        try:
            validate_password(attrs["new_password"], user=user)
        except DjangoValidationError as exc:
            raise serializers.ValidationError(
                {
                    "new_password": [
                        {"code": "password_invalid", "message": message}
                        for message in exc.messages
                    ]
                }
            ) from exc
        return attrs


class EmptyActionSerializer(serializers.Serializer):
    pass
