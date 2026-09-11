from rest_framework import serializers


class WebsiteCommerceProductSerializer(serializers.Serializer):
    id = serializers.UUIDField()
    family_id = serializers.UUIDField(allow_null=True)
    family_name = serializers.CharField(allow_blank=True)
    name = serializers.CharField()
    sku = serializers.CharField(allow_blank=True)
    brand = serializers.CharField(allow_blank=True)
    variant = serializers.CharField(allow_blank=True)
    variant_options = serializers.JSONField()
    tracking_mode = serializers.CharField()
    linked = serializers.BooleanField()
    website_listing_id = serializers.UUIDField(allow_null=True)
    website_variant_id = serializers.UUIDField(allow_null=True)


class WebsiteCommerceImportSerializer(serializers.Serializer):
    product_ids = serializers.ListField(
        child=serializers.UUIDField(),
        allow_empty=False,
    )

    def validate_product_ids(self, value):
        if len(value) != len(set(value)):
            raise serializers.ValidationError("Commerce product ids must be unique.")
        return value
