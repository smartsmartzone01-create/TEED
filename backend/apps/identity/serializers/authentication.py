from rest_framework import serializers


class EmailLoginSerializer(serializers.Serializer):
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