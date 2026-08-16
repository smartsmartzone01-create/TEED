from decimal import Decimal

from rest_framework import serializers

from .models import Sale, SaleItem


class SaleItemInputSerializer(serializers.Serializer):
    source = serializers.ChoiceField(
        choices=SaleItem.Source.choices, default=SaleItem.Source.CATALOG
    )
    product_id = serializers.UUIDField(required=False, allow_null=True)
    tracked_unit_id = serializers.UUIDField(required=False, allow_null=True)
    item_name = serializers.CharField(max_length=160, required=False, allow_blank=True)
    item_details = serializers.JSONField(required=False, default=dict)
    acquisition_unit_cost = serializers.DecimalField(
        max_digits=14,
        decimal_places=2,
        min_value=Decimal("0"),
        required=False,
        allow_null=True,
    )
    quantity = serializers.DecimalField(
        max_digits=14, decimal_places=3, min_value=Decimal("0.001")
    )
    unit_price = serializers.DecimalField(
        max_digits=14, decimal_places=2, min_value=Decimal("0"), required=False
    )

    def validate(self, attrs):
        source = attrs["source"]
        if source == SaleItem.Source.MANUAL:
            if not attrs.get("item_name", "").strip():
                raise serializers.ValidationError(
                    {"item_name": "Enter the item name for an independent sale item."}
                )
            if "unit_price" not in attrs:
                raise serializers.ValidationError(
                    {"unit_price": "Enter the selling price for an independent sale item."}
                )
            attrs.pop("product_id", None)
            attrs.pop("tracked_unit_id", None)
        elif not attrs.get("product_id"):
            raise serializers.ValidationError(
                {"product_id": "Choose a TEED product / SKU."}
            )
        return attrs


class SaleCreateSerializer(serializers.Serializer):
    sale_mode = serializers.ChoiceField(choices=Sale.SaleMode.choices)
    sale_type = serializers.ChoiceField(choices=Sale.SaleType.choices)
    customer_name = serializers.CharField(
        max_length=120, required=False, allow_blank=True
    )
    customer_phone = serializers.CharField(
        max_length=32, required=False, allow_blank=True
    )
    customer_region = serializers.CharField(
        max_length=120, required=False, allow_blank=True
    )
    discount = serializers.DecimalField(
        max_digits=14, decimal_places=2, min_value=Decimal("0"), default=0
    )
    payment_status = serializers.ChoiceField(choices=Sale.PaymentStatus.choices)
    sold_at = serializers.DateTimeField()
    items = SaleItemInputSerializer(many=True, min_length=1)

    def validate(self, attrs):
        mode = attrs["sale_mode"]
        if mode == Sale.SaleMode.TRADE_IN:
            raise serializers.ValidationError(
                {"sale_mode": "Trade-in requires the incoming-item contract and is not enabled yet."}
            )
        expected = (
            SaleItem.Source.CATALOG
            if mode == Sale.SaleMode.STOCK
            else SaleItem.Source.MANUAL
        )
        if any(item["source"] != expected for item in attrs["items"]):
            raise serializers.ValidationError(
                {"items": "All items must match the selected sale mode."}
            )
        return attrs


class SaleVoidSerializer(serializers.Serializer):
    reason = serializers.CharField(min_length=3, max_length=240)


class SaleItemSerializer(serializers.ModelSerializer):
    product_name = serializers.SerializerMethodField()
    product_sku = serializers.SerializerMethodField()
    tracked_unit_reference = serializers.SerializerMethodField()

    class Meta:
        model = SaleItem
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
            "acquisition_unit_cost",
            "quantity",
            "unit_price",
            "line_total",
            "cost_total",
            "returned_quantity",
        ]

    def get_product_name(self, obj):
        return obj.product.name if obj.product_id else obj.item_name

    def get_product_sku(self, obj):
        return obj.product.sku if obj.product_id else ""

    def get_tracked_unit_reference(self, obj):
        if not obj.tracked_unit_id:
            return ""
        identifiers = list(obj.tracked_unit.identifiers.all())
        if identifiers:
            return " · ".join(
                f"{identifier.kind}: {identifier.value}" for identifier in identifiers
            )
        return obj.tracked_unit.internal_serial


class SaleSerializer(serializers.ModelSerializer):
    items = SaleItemSerializer(many=True, read_only=True)
    gross_profit = serializers.SerializerMethodField()

    class Meta:
        model = Sale
        fields = [
            "id",
            "receipt_number",
            "receipt_sequence",
            "status",
            "sale_mode",
            "sale_type",
            "customer_name",
            "customer_phone",
            "customer_region",
            "subtotal",
            "discount",
            "total",
            "cost_of_goods",
            "gross_profit",
            "payment_status",
            "sold_at",
            "recorded_by",
            "voided_at",
            "void_reason",
            "items",
        ]

    def get_gross_profit(self, obj):
        return obj.total - obj.cost_of_goods

    def to_representation(self, instance):
        data = super().to_representation(instance)
        if not self.context.get("show_costs", False):
            data.pop("cost_of_goods", None)
            data.pop("gross_profit", None)
            for item in data["items"]:
                item.pop("cost_total", None)
        return data
