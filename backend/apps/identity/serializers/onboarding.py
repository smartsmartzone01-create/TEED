import re

from rest_framework import serializers

COUNTRY_PHONE_RULES = {
    "TZ": {
        "name": "Tanzania",
        "calling_code": "255",
        "national_pattern": r"^[67]\d{8}$",
    },
    "KE": {
        "name": "Kenya",
        "calling_code": "254",
        "national_pattern": r"^[17]\d{8}$",
    },
    "UG": {
        "name": "Uganda",
        "calling_code": "256",
        "national_pattern": r"^7\d{8}$",
    },
}


class OnboardingSerializer(serializers.Serializer):
    username = serializers.RegexField(
        regex=r"^[A-Za-z0-9_]{3,30}$",
        error_messages={
            "invalid": (
                "Username must contain 3 to 30 letters, numbers, or underscores."
            ),
        },
    )

    country_code = serializers.ChoiceField(
        choices=[
            ("TZ", "Tanzania"),
            ("KE", "Kenya"),
            ("UG", "Uganda"),
        ],
    )

    phone_number = serializers.CharField(
        max_length=24,
    )

    def validate_username(self, value):
        return value.strip().lower()

    def validate_country_code(self, value):
        return value.upper()

    def validate(self, attrs):
        country_code = attrs["country_code"]
        rule = COUNTRY_PHONE_RULES[country_code]

        phone_number = re.sub(
            r"[\s\-()]",
            "",
            attrs["phone_number"],
        )

        calling_code = rule["calling_code"]

        if phone_number.startswith("+"):
            expected_prefix = f"+{calling_code}"

            if not phone_number.startswith(expected_prefix):
                raise serializers.ValidationError(
                    {
                        "phone_number": (
                            "The phone number does not match the selected country."
                        )
                    }
                )

            national_number = phone_number[len(expected_prefix) :]

        elif phone_number.startswith(calling_code):
            national_number = phone_number[len(calling_code) :]

        elif phone_number.startswith("0"):
            national_number = phone_number[1:]

        else:
            national_number = phone_number

        if not re.fullmatch(
            rule["national_pattern"],
            national_number,
        ):
            raise serializers.ValidationError(
                {"phone_number": (f"Enter a valid phone number for {rule['name']}.")}
            )

        attrs["phone_number"] = f"+{calling_code}{national_number}"

        return attrs
