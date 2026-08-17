from decimal import Decimal

from rest_framework import serializers

from .models import Sale, SaleItem, TradeInDetail


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


class TradeInInputSerializer(serializers.Serializer):
    incoming_item_name = serializers.CharField(max_length=160)
    incoming_item_details = serializers.JSONField(required=False, default=dict)
    incoming_value = serializers.DecimalField(
        max_digits=14, decimal_places=2, min_value=Decimal("0")
    )
    cash_top_up = serializers.DecimalField(
        max_digits=14, decimal_places=2, min_value=Decimal("0")
    )
    add_to_stock = serializers.BooleanField(default=False)
    stock_product_id = serializers.UUIDField(required=False, allow_null=True)
    stock_group_name = serializers.CharField(
        max_length=120, required=False, allow_blank=True, default=""
    )


class SaleCreateSerializer(serializers.Serializer):
    sale_mode = serializers.ChoiceField(
        choices=[Sale.SaleMode.STOCK, Sale.SaleMode.INDEPENDENT]
    )
    transaction_type = serializers.ChoiceField(
        choices=Sale.TransactionType.choices, default=Sale.TransactionType.NORMAL
    )
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
    trade_in = TradeInInputSerializer(required=False, allow_null=True)

    def validate(self, attrs):
        mode = attrs["sale_mode"]
        expected = (
            SaleItem.Source.CATALOG
            if mode == Sale.SaleMode.STOCK
            else SaleItem.Source.MANUAL
        )
        if any(item["source"] != expected for item in attrs["items"]):
            raise serializers.ValidationError(
                {"items": "All outgoing items must match the selected sale source."}
            )

        transaction_type = attrs["transaction_type"]
        trade_in = attrs.get("trade_in")
        if transaction_type == Sale.TransactionType.NORMAL:
            attrs["trade_in"] = None
            return attrs

        if not trade_in:
            raise serializers.ValidationError(
                {"trade_in": "Record the incoming customer item for a trade-in."}
            )
        if any("unit_price" not in item for item in attrs["items"]):
            raise serializers.ValidationError(
                {"items": "Enter the agreed sale value for every outgoing trade-in item."}
            )
        outgoing_value = sum(
            (item["quantity"] * item["unit_price"] for item in attrs["items"]),
            Decimal("0"),
        ) - attrs["discount"]
        if outgoing_value < 0:
            outgoing_value = Decimal("0")
        consideration = trade_in["incoming_value"] + trade_in["cash_top_up"]
        if outgoing_value != consideration:
            raise serializers.ValidationError(
                {
                    "trade_in": (
                        "Trade-in values must balance: agreed outgoing value must equal "
                        "incoming item value plus cash top-up."
                    )
                }
            )
        return attrs


class SaleVoidSerializer(serializers.Serializer):
    reason = serializers.CharField(min_length=3, max_length=240)


class SaleItemSerializer(serializers.ModelSerializer):
    product_name = serializers.SerializerMethodField()
    product_sku = serializers.SerializerMethodField()
    tracked_unit_reference = serializers.SerializerMethodField()
    tracked_unit_details = serializers.SerializerMethodField()

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
            "tracked_unit_details",
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

    def get_tracked_unit_details(self, obj):
        if not obj.tracked_unit_id:
            return {}
        unit = obj.tracked_unit
        identifiers = [
            {"kind": identifier.kind, "value": identifier.value}
            for identifier in unit.identifiers.all()
        ]
        return {
            "model_name": unit.model_name,
            "brand": unit.brand,
            "color": unit.color,
            "capacity": unit.capacity,
            "condition": unit.condition,
            "internal_serial": unit.internal_serial,
            "identifiers": identifiers,
        }


class TradeInDetailSerializer(serializers.ModelSerializer):
    stock_product_sku = serializers.SerializerMethodField()
    stock_receipt_reference = serializers.SerializerMethodField()

    class Meta:
        model = TradeInDetail
        fields = [
            "incoming_item_name",
            "incoming_item_details",
            "incoming_value",
            "cash_top_up",
            "add_to_stock",
            "stock_product",
            "stock_product_sku",
            "stock_group_name",
            "stock_receipt",
            "stock_receipt_reference",
        ]

    def get_stock_product_sku(self, obj):
        return obj.stock_product.sku if obj.stock_product_id else ""

    def get_stock_receipt_reference(self, obj):
        return obj.stock_receipt.reference if obj.stock_receipt_id else ""


class SaleSerializer(serializers.ModelSerializer):
    items = SaleItemSerializer(many=True, read_only=True)
    trade_in = serializers.SerializerMethodField()
    gross_profit = serializers.SerializerMethodField()

    class Meta:
        model = Sale
        fields = [
            "id",
            "receipt_number",
            "receipt_sequence",
            "status",
            "sale_mode",
            "transaction_type",
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
            "trade_in",
        ]

    def get_trade_in(self, obj):
        try:
            detail = obj.trade_in_detail
        except TradeInDetail.DoesNotExist:
            return None
        return TradeInDetailSerializer(detail).data

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
