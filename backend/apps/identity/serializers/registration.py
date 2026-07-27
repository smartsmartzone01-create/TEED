from django.contrib.auth.password_validation import (
    validate_password,
)
from django.core.exceptions import ValidationError
from rest_framework import serializers


class EmailRegistrationSerializer(
    serializers.Serializer
):
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
                list(exc.messages)
            ) from exc

        return value