from rest_framework import serializers


class AccountProtectionEmailRequestSerializer(serializers.Serializer):
    email = serializers.EmailField(max_length=254, required=False)

    def validate_email(self, value):
        return value.strip().lower()


class AccountProtectionCodeSerializer(serializers.Serializer):
    code = serializers.RegexField(r"^\d{6}$", max_length=6)
