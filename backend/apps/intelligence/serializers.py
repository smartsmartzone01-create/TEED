from rest_framework import serializers


class PartnerRequestSerializer(serializers.Serializer):
    message = serializers.CharField(max_length=4000, trim_whitespace=True)
    locale = serializers.ChoiceField(
        choices=("en", "sw"),
        required=False,
    )
