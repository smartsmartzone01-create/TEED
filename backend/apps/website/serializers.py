from io import BytesIO

from PIL import Image, UnidentifiedImageError
from rest_framework import serializers

from .models import WebsiteListing, WebsiteMedia, WebsiteSite, WebsiteVariant

WEBSITE_MEDIA_MAX_UPLOAD_BYTES = 10 * 1024 * 1024
WEBSITE_MEDIA_ALLOWED_FORMATS = {"JPEG", "PNG", "WEBP"}


def _validate_locale_map(value, *, field_name, require_value=False):
    if not isinstance(value, dict):
        raise serializers.ValidationError(f"{field_name} must be a locale map.")
    if any(not isinstance(key, str) or not isinstance(item, str) for key, item in value.items()):
        raise serializers.ValidationError(f"{field_name} locale keys and values must be strings.")
    if require_value and not any(item.strip() for item in value.values()):
        raise serializers.ValidationError(f"{field_name} must contain at least one value.")
    return value


class WebsiteSiteSerializer(serializers.ModelSerializer):
    class Meta:
        model = WebsiteSite
        fields = (
            "id",
            "public_key",
            "slug",
            "display_name",
            "default_locale",
            "supported_locales",
            "primary_color",
            "surface_color",
            "text_color",
            "contact_phone",
            "contact_email",
            "contact_whatsapp",
            "contact_instagram",
            "navigation",
            "hero",
            "services",
            "newsletter",
            "is_published",
            "created_at",
            "updated_at",
        )
        read_only_fields = ("id", "public_key", "created_at", "updated_at")


class WebsiteSiteWriteSerializer(serializers.ModelSerializer):
    class Meta:
        model = WebsiteSite
        fields = (
            "slug",
            "display_name",
            "default_locale",
            "supported_locales",
            "primary_color",
            "surface_color",
            "text_color",
            "contact_phone",
            "contact_email",
            "contact_whatsapp",
            "contact_instagram",
            "navigation",
            "hero",
            "services",
            "newsletter",
            "is_published",
        )
        extra_kwargs = {
            "slug": {"required": False},
            "display_name": {"required": False},
        }


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
        return _validate_locale_map(value, field_name="Media alt text")


class WebsiteMediaUploadSerializer(serializers.Serializer):
    file = serializers.FileField()
    alt_text = serializers.JSONField(required=False, default=dict)
    sort_order = serializers.IntegerField(min_value=0, required=False)

    def validate_alt_text(self, value):
        return _validate_locale_map(value, field_name="Media alt text")

    def validate_file(self, value):
        if value.size > WEBSITE_MEDIA_MAX_UPLOAD_BYTES:
            raise serializers.ValidationError("Image must be 10 MB or smaller.")

        payload = value.read()
        value.seek(0)
        try:
            with Image.open(BytesIO(payload)) as image:
                image.verify()
            with Image.open(BytesIO(payload)) as image:
                image_format = image.format
                width, height = image.size
        except (UnidentifiedImageError, OSError, ValueError):
            raise serializers.ValidationError("Upload a valid image file.") from None

        if image_format not in WEBSITE_MEDIA_ALLOWED_FORMATS:
            raise serializers.ValidationError("Only JPEG, PNG, and WEBP images are allowed.")

        value.website_image_format = image_format
        value.website_image_width = width
        value.website_image_height = height
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


class WebsiteVariantSerializer(serializers.ModelSerializer):
    media_id = serializers.SerializerMethodField()
    commerce_product_id = serializers.SerializerMethodField()

    class Meta:
        model = WebsiteVariant
        fields = (
            "id",
            "sku",
            "options",
            "website_price",
            "currency",
            "website_availability",
            "media_id",
            "commerce_product_id",
            "price_source",
            "availability_source",
            "is_published",
            "sort_order",
            "created_at",
            "updated_at",
        )

    def get_media_id(self, obj):
        return obj.media_id

    def get_commerce_product_id(self, obj):
        return obj.commerce_product_id


class WebsiteVariantWriteSerializer(serializers.Serializer):
    sku = serializers.CharField(max_length=64, allow_blank=True, required=False)
    options = serializers.JSONField(required=False)
    website_price = serializers.DecimalField(
        max_digits=14,
        decimal_places=2,
        min_value=0,
        allow_null=True,
        required=False,
    )
    currency = serializers.CharField(max_length=3, min_length=3, required=False)
    website_availability = serializers.ChoiceField(
        choices=WebsiteVariant.Availability.choices,
        required=False,
    )
    media_id = serializers.UUIDField(allow_null=True, required=False)
    is_published = serializers.BooleanField(required=False)
    sort_order = serializers.IntegerField(min_value=0, required=False)

    def validate_options(self, value):
        if not isinstance(value, dict):
            raise serializers.ValidationError("Variant options must be an object.")
        if any(not isinstance(key, str) or not isinstance(item, str) for key, item in value.items()):
            raise serializers.ValidationError("Variant option keys and values must be strings.")
        return value

    def validate_currency(self, value):
        return value.upper()


class WebsiteListingSerializer(serializers.ModelSerializer):
    primary_media_id = serializers.SerializerMethodField()
    variants = WebsiteVariantSerializer(many=True, read_only=True)

    class Meta:
        model = WebsiteListing
        fields = (
            "id",
            "slug",
            "title",
            "short_description",
            "description",
            "brand",
            "badge",
            "primary_media_id",
            "options",
            "is_published",
            "sort_order",
            "variants",
            "created_at",
            "updated_at",
        )

    def get_primary_media_id(self, obj):
        return obj.primary_media_id


class WebsiteListingWriteSerializer(serializers.Serializer):
    slug = serializers.SlugField(max_length=120)
    title = serializers.JSONField()
    short_description = serializers.JSONField(required=False)
    description = serializers.JSONField(required=False)
    brand = serializers.CharField(max_length=80, allow_blank=True, required=False)
    badge = serializers.JSONField(required=False)
    primary_media_id = serializers.UUIDField(allow_null=True, required=False)
    options = serializers.JSONField(required=False)
    is_published = serializers.BooleanField(required=False)
    sort_order = serializers.IntegerField(min_value=0, required=False)

    def validate_title(self, value):
        return _validate_locale_map(value, field_name="Listing title", require_value=True)

    def validate_short_description(self, value):
        return _validate_locale_map(value, field_name="Short description")

    def validate_description(self, value):
        return _validate_locale_map(value, field_name="Description")

    def validate_badge(self, value):
        return _validate_locale_map(value, field_name="Badge")

    def validate_options(self, value):
        if not isinstance(value, list):
            raise serializers.ValidationError("Listing options must be a list.")
        return value
