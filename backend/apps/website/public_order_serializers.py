from rest_framework import serializers


class PublicStorefrontOrderItemInputSerializer(serializers.Serializer):
    websiteVariantId = serializers.UUIDField()
    offerId = serializers.CharField(max_length=160)
    quantity = serializers.IntegerField(min_value=1, max_value=99)


class PublicStorefrontOrderCreateSerializer(serializers.Serializer):
    fullName = serializers.CharField(max_length=120)
    phone = serializers.CharField(max_length=32)
    email = serializers.EmailField(required=False, allow_blank=True, default="")
    deliveryAddress = serializers.CharField(max_length=1000)
    note = serializers.CharField(max_length=2000, required=False, allow_blank=True, default="")
    items = PublicStorefrontOrderItemInputSerializer(many=True, allow_empty=False)

    def validate_items(self, items):
        if len(items) > 30:
            raise serializers.ValidationError("An order can contain at most 30 different items.")

        seen = set()
        for item in items:
            key = (str(item["websiteVariantId"]), item["offerId"])
            if key in seen:
                raise serializers.ValidationError("Duplicate bag items are not allowed.")
            seen.add(key)
        return items
