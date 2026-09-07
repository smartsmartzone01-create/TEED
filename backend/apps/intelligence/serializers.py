from rest_framework import serializers


class PartnerHistoryMessageSerializer(serializers.Serializer):
    role = serializers.ChoiceField(choices=("user", "assistant"))
    content = serializers.CharField(max_length=4000, trim_whitespace=True)


class PartnerRequestSerializer(serializers.Serializer):
    message = serializers.CharField(max_length=4000, trim_whitespace=True)
    locale = serializers.ChoiceField(
        choices=("en", "sw"),
        required=False,
    )
    history = PartnerHistoryMessageSerializer(
        many=True,
        required=False,
        max_length=12,
    )
