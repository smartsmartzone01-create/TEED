from django.conf import settings
from rest_framework import serializers


class EmailVerificationSerializer(
    serializers.Serializer
):
    email = serializers.EmailField(
        max_length=254,
    )
    code = serializers.RegexField(
        regex=(
            rf"^\d{{"
            rf"{settings.EMAIL_VERIFICATION_CODE_LENGTH}"
            rf"}}$"
        ),
        trim_whitespace=True,
        error_messages={
            "invalid": (
                "Enter a valid numeric verification "
                "code."
            ),
        },
    )

    def validate_email(self, value):
        return value.strip().lower()


class EmailVerificationResendSerializer(
    serializers.Serializer
):
    email = serializers.EmailField(
        max_length=254,
    )

    def validate_email(self, value):
        return value.strip().lower()