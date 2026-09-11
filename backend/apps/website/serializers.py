from rest_framework import serializers

from .models import WebsiteMedia


class WebsiteMediaSerializer(serializers.ModelSerializer):
    class Meta:
        model = WebsiteMedia
        fields = (
            "id",
            "kind",
            "public_url",
            "storage_key",
            "original_name",
            "mime_type",
            "alt_text",
            "width",
            "height",
            "size_bytes",
            "sort_order",
            "created_at",
            "updated_at",
        )
        read_only_fields = ("id", "created_at", "updated_at")


class WebsiteMediaRegisterSerializer(serializers.Serializer):
    kind = serializers.ChoiceField(
        choices=WebsiteMedia.Kind.choices,
        default=WebsiteMedia.Kind.IMAGE,
    )
    public_url = serializers.URLField(max_length=500)
    storage_key = serializers.CharField(max_length=500, allow_blank=True, required=False)
    original_name = serializers.CharField(max_length=255, allow_blank=True, required=False)
    mime_type = serializers.CharField(max_length=100, allow_blank=True, required=False)
    alt_text = serializers.JSONField(required=False)
    width = serializers.IntegerField(min_value=1, allow_null=True, required=False)
    height = serializers.IntegerField(min_value=1, allow_null=True, required=False)
    size_bytes = serializers.IntegerField(min_value=0, allow_null=True, required=False)
    sort_order = serializers.IntegerField(min_value=0, required=False)

    def validate_alt_text(self, value):
        if not isinstance(value, dict):
            raise serializers.ValidationError("Media alt text must be a locale map.")
        return value


class WebsiteMediaUpdateSerializer(WebsiteMediaRegisterSerializer):
    public_url = serializers.URLField(max_length=500, required=False)
    kind = serializers.ChoiceField(choices=WebsiteMedia.Kind.choices, required=False)


class WebsiteMediaReorderSerializer(serializers.Serializer):
    media_ids = serializers.ListField(
        child=serializers.UUIDField(),
        allow_empty=False,
    )

    def validate_media_ids(self, value):
        if len(value) != len(set(value)):
            raise serializers.ValidationError("Media ids must be unique.")
        return value
