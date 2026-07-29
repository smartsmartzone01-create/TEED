from django.contrib.auth.password_validation import (
    validate_password,
)
from django.core.exceptions import ValidationError
from rest_framework import serializers


def _password_validation_details(exc):
    details = []

    for error in exc.error_list:
        message = error.message
        if error.params:
            message %= error.params

        details.append(
            serializers.ErrorDetail(
                message,
                code=error.code or "invalid",
            )
        )

    return details


class EmailRegistrationSerializer(serializers.Serializer):
    email = serializers.EmailField(
        max_length=254,
    )
    password = serializers.CharField(
        write_only=True,
        trim_whitespace=False,
        style={
            "input_type": "password",
        },
    )

    def validate_email(self, value):
        return value.strip().lower()

    def validate_password(self, value):
        try:
            validate_password(value)
        except ValidationError as exc:
            raise serializers.ValidationError(
                _password_validation_details(exc)
            ) from exc

        return value
