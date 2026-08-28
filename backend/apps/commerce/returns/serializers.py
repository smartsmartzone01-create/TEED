from decimal import Decimal

from rest_framework import serializers

from .models import ReturnItem, ReturnReplacement, SaleReturn

RETURN_REASONS = [
    "damaged",
    "defective",
    "wrong_item",
    "wrong_size",
    "changed_mind",
    "not_as_expected",
    "other",
]


class ReturnItemInputSerializer(serializers.Serializer):
    sale_item_id = serializers.UUIDField()
    quantity = serializers.DecimalField(
        max_digits=14, decimal_places=3, min_value=Decimal("0.001")
    )
    condition = serializers.ChoiceField(choices=["sellable", "damaged"])


class ReturnReplacementInputSerializer(serializers.Serializer):
    source = serializers.ChoiceField(choices=ReturnReplacement.Source.choices)
    product_id = serializers.UUIDField(required=False)
    tracked_unit_id = serializers.UUIDField(required=False)
    item_name = serializers.CharField(max_length=160, required=False, allow_blank=True)
    item_details = serializers.JSONField(required=False, default=dict)
    quantity = serializers.DecimalField(
        max_digits=14, decimal_places=3, min_value=Decimal("0.001")
    )
    acquisition_unit_cost = serializers.DecimalField(
        max_digits=14,
        decimal_places=2,
        min_value=Decimal("0"),
        required=False,
        allow_null=True,
    )

    def validate(self, attrs):
        source = attrs["source"]
        if source == ReturnReplacement.Source.STOCK:
            if not attrs.get("product_id"):
                raise serializers.ValidationError(
                    {"product_id": "Choose the replacement SKU from stock."}
                )
            if attrs.get("item_name"):
                raise serializers.ValidationError(
                    {"item_name": "Stock replacements use the selected SKU name."}
                )
            return attrs

        if not attrs.get("item_name", "").strip():
            raise serializers.ValidationError(
                {"item_name": "Enter the independent replacement item."}
            )
        if attrs.get("acquisition_unit_cost") is None:
            raise serializers.ValidationError(
                {
                    "acquisition_unit_cost": (
                        "Enter what the independent replacement cost the business."
                    )
                }
            )
        if attrs.get("product_id") or attrs.get("tracked_unit_id"):
            raise serializers.ValidationError(
                "Independent replacements cannot reference TEED stock."
            )
        return attrs


class ReturnCreateSerializer(serializers.Serializer):
    sale_id = serializers.UUIDField()
    resolution = serializers.ChoiceField(choices=SaleReturn.Resolution.choices)
    reason = serializers.ChoiceField(choices=RETURN_REASONS)
    returned_at = serializers.DateTimeField()
    items = ReturnItemInputSerializer(many=True, min_length=1)
    replacement = ReturnReplacementInputSerializer(required=False, allow_null=True)

    def validate(self, attrs):
        resolution = attrs["resolution"]
        replacement = attrs.get("replacement")
        if resolution == SaleReturn.Resolution.REPLACEMENT and not replacement:
            raise serializers.ValidationError(
                {"replacement": "Describe the item given as the replacement."}
            )
        if resolution != SaleReturn.Resolution.REPLACEMENT and replacement:
            raise serializers.ValidationError(
                {"replacement": "Only replacement returns can include a replacement item."}
            )
        return attrs


class ReturnItemSerializer(serializers.ModelSerializer):
    sale_item_name = serializers.SerializerMethodField()
    sale_item_sku = serializers.SerializerMethodField()

    class Meta:
        model = ReturnItem
        fields = [
            "id",
            "sale_item",
            "sale_item_name",
            "sale_item_sku",
            "quantity",
            "condition",
            "amount",
            "cost_total",
        ]

    def get_sale_item_name(self, obj):
        return obj.sale_item.product.name if obj.sale_item.product_id else obj.sale_item.item_name

    def get_sale_item_sku(self, obj):
        return obj.sale_item.product.sku if obj.sale_item.product_id else ""


class ReturnReplacementSerializer(serializers.ModelSerializer):
    product_name = serializers.CharField(source="product.name", read_only=True, default="")
    product_sku = serializers.CharField(source="product.sku", read_only=True, default="")
    tracked_unit_reference = serializers.CharField(
        source="tracked_unit.internal_serial", read_only=True, default=""
    )

    class Meta:
        model = ReturnReplacement
        fields = [
            "id",
            "source",
            "product",
            "product_name",
            "product_sku",
            "tracked_unit",
            "tracked_unit_reference",
            "item_name",
            "item_details",
            "quantity",
            "acquisition_unit_cost",
            "cost_total",
        ]


class ReturnSerializer(serializers.ModelSerializer):
    receipt_number = serializers.CharField(source="sale.receipt_number", read_only=True)
    items = ReturnItemSerializer(many=True, read_only=True)
    replacement = ReturnReplacementSerializer(read_only=True, allow_null=True)

    class Meta:
        model = SaleReturn
        fields = [
            "id",
            "return_number",
            "sale",
            "receipt_number",
            "resolution",
            "reason",
            "total",
            "refund_amount",
            "credit_amount",
            "recovered_inventory_cost",
            "damaged_loss",
            "replacement_cost",
            "returned_at",
            "items",
            "replacement",
        ]


__all__ = ["ReturnCreateSerializer", "ReturnSerializer"]
