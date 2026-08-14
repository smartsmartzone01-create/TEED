from decimal import Decimal

from rest_framework import serializers

from .models import (
    Budget,
    CommerceDecision,
    Expense,
    InventoryMovement,
    Product,
    Sale,
    SaleItem,
    SaleReturn,
    StockBatch,
    StockContainer,
    StockGroup,
    StockReceipt,
    TrackedUnit,
    TrackedUnitIdentifier,
    UnitDefinition,
)


class ProductSerializer(serializers.ModelSerializer):
    class Meta:
        model = Product
        fields = [
            "id",
            "name",
            "sku",
            "barcode",
            "group",
            "brand",
            "variant",
            "unit",
            "selling_price",
            "tracking_mode",
            "low_stock_threshold",
            "current_quantity",
            "is_active",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "sku", "current_quantity", "created_at", "updated_at"]


class TrackedIdentifierInputSerializer(serializers.Serializer):
    kind = serializers.ChoiceField(choices=TrackedUnitIdentifier.Kind.choices)
    value = serializers.CharField(max_length=160)


class TrackedUnitInputSerializer(serializers.Serializer):
    model_name = serializers.CharField(max_length=120, required=False, allow_blank=True)
    brand = serializers.CharField(max_length=80, required=False, allow_blank=True)
    color = serializers.CharField(max_length=60, required=False, allow_blank=True)
    capacity = serializers.CharField(max_length=80, required=False, allow_blank=True)
    imei = serializers.CharField(max_length=80, required=False, allow_blank=True)
    serial_number = serializers.CharField(
        max_length=120, required=False, allow_blank=True
    )
    condition = serializers.CharField(max_length=40, required=False, allow_blank=True)
    identifiers = TrackedIdentifierInputSerializer(
        many=True, required=False, default=list
    )


class StockLineInputSerializer(serializers.Serializer):
    product_id = serializers.UUIDField(required=False)
    item = ProductSerializer(required=False)
    tracking_mode = serializers.ChoiceField(
        choices=Product.TrackingMode.choices, required=False
    )
    quantity_received = serializers.DecimalField(
        max_digits=14, decimal_places=3, min_value=Decimal("0.001")
    )
    received_unit = serializers.CharField(max_length=32, required=False)
    conversion_to_base = serializers.DecimalField(
        max_digits=14,
        decimal_places=6,
        min_value=Decimal("0.000001"),
        required=False,
    )
    unit_cost = serializers.DecimalField(
        max_digits=14,
        decimal_places=2,
        min_value=Decimal("0"),
        required=False,
        allow_null=True,
    )
    tracked_units = TrackedUnitInputSerializer(many=True, required=False, default=list)

    def validate(self, attrs):
        if bool(attrs.get("product_id")) == bool(attrs.get("item")):
            raise serializers.ValidationError(
                "Choose an existing item or enter a new item, not both."
            )
        return attrs


class StockGroupInputSerializer(serializers.Serializer):
    name = serializers.CharField(max_length=120)
    quantity = serializers.DecimalField(
        max_digits=14, decimal_places=3, min_value=Decimal("0.001")
    )
    unit = serializers.CharField(max_length=32)
    base_unit = serializers.CharField(max_length=32, required=False, allow_blank=True)
    custom_unit_name = serializers.CharField(
        max_length=32, required=False, allow_blank=True, write_only=True
    )
    conversion_to_base = serializers.DecimalField(
        max_digits=14, decimal_places=6, min_value=Decimal("0.000001"), default=1
    )
    buying_price = serializers.DecimalField(
        max_digits=14,
        decimal_places=2,
        min_value=Decimal("0"),
        required=False,
        allow_null=True,
    )
    selling_price = serializers.DecimalField(
        max_digits=14,
        decimal_places=2,
        min_value=Decimal("0"),
        required=False,
        allow_null=True,
    )
    types = StockLineInputSerializer(many=True, required=False, default=list)


class StockContainerInputSerializer(serializers.Serializer):
    name = serializers.CharField(max_length=120)
    notes = serializers.CharField(max_length=240, required=False, allow_blank=True)
    groups = StockGroupInputSerializer(many=True, min_length=1)


class StockReceiptCreateSerializer(serializers.Serializer):
    status = serializers.ChoiceField(
        choices=[StockReceipt.Status.DRAFT, StockReceipt.Status.RECEIVED],
        default=StockReceipt.Status.RECEIVED,
    )
    supplier_name = serializers.CharField(
        max_length=120, required=False, allow_blank=True
    )
    supplier_reference = serializers.CharField(
        max_length=80, required=False, allow_blank=True
    )
    additional_cost = serializers.DecimalField(
        max_digits=14, decimal_places=2, min_value=Decimal("0"), default=0
    )
    notes = serializers.CharField(max_length=300, required=False, allow_blank=True)
    received_at = serializers.DateTimeField(required=False, allow_null=True)
    batches = StockContainerInputSerializer(many=True, min_length=1)

    def validate(self, attrs):
        if attrs["status"] == StockReceipt.Status.RECEIVED:
            for batch in attrs["batches"]:
                for group in batch["groups"]:
                    types = group.get("types", [])
                    if (
                        types
                        and sum(item["quantity_received"] for item in types)
                        != group["quantity"]
                    ):
                        raise serializers.ValidationError(
                            {
                                "batches": "Product quantities must equal the group quantity."
                            }
                        )
        if attrs["status"] == StockReceipt.Status.RECEIVED and not attrs.get(
            "received_at"
        ):
            raise serializers.ValidationError(
                {"received_at": "Enter the date received."}
            )
        return attrs


class TrackedUnitSerializer(serializers.ModelSerializer):
    identifiers = serializers.SerializerMethodField()

    class Meta:
        model = TrackedUnit
        fields = [
            "id",
            "internal_serial",
            "model_name",
            "brand",
            "color",
            "capacity",
            "imei",
            "serial_number",
            "condition",
            "status",
            "identifiers",
        ]

    def get_identifiers(self, obj):
        return TrackedUnitIdentifierSerializer(obj.identifiers.all(), many=True).data


class TrackedUnitIdentifierSerializer(serializers.ModelSerializer):
    class Meta:
        model = TrackedUnitIdentifier
        fields = ["id", "kind", "value"]


class UnitDefinitionSerializer(serializers.ModelSerializer):
    class Meta:
        model = UnitDefinition
        fields = ["id", "code", "name", "base_unit", "conversion_to_base"]


class StockReceiptSerializer(serializers.ModelSerializer):
    lines = serializers.SerializerMethodField()
    batches = serializers.SerializerMethodField()

    class Meta:
        model = StockReceipt
        fields = [
            "id",
            "reference",
            "status",
            "supplier_name",
            "supplier_reference",
            "additional_cost",
            "notes",
            "received_at",
            "created_at",
            "batches",
            "lines",
        ]

    def get_lines(self, obj):
        return StockBatchSerializer(obj.lines.all(), many=True).data

    def get_batches(self, obj):
        return StockContainerSerializer(obj.batches.all(), many=True).data


class StockBatchSerializer(serializers.ModelSerializer):
    product_name = serializers.CharField(source="product.name", read_only=True)

    class Meta:
        model = StockBatch
        fields = [
            "id",
            "product",
            "product_name",
            "tracking_mode",
            "reference",
            "quantity_received",
            "quantity_remaining",
            "received_unit",
            "conversion_to_base",
            "unit_cost",
            "additional_cost",
            "received_at",
            "supplier_name",
            "created_at",
            "tracked_units",
        ]

    tracked_units = TrackedUnitSerializer(many=True, read_only=True)


class StockGroupSerializer(serializers.ModelSerializer):
    types = serializers.SerializerMethodField()

    class Meta:
        model = StockGroup
        fields = [
            "id",
            "code",
            "name",
            "quantity",
            "unit",
            "base_unit",
            "conversion_to_base",
            "buying_price",
            "selling_price",
            "types",
        ]

    def get_types(self, obj):
        return StockBatchSerializer(obj.type_lines.all(), many=True).data


class StockContainerSerializer(serializers.ModelSerializer):
    groups = StockGroupSerializer(many=True, read_only=True)

    class Meta:
        model = StockContainer
        fields = ["id", "code", "name", "notes", "groups"]


class LegacyStockReceiptSerializer(serializers.Serializer):
    product_id = serializers.UUIDField()
    reference = serializers.CharField(max_length=64, required=False, allow_blank=True)
    quantity_received = serializers.DecimalField(
        max_digits=14, decimal_places=3, min_value=Decimal("0.001")
    )
    unit_cost = serializers.DecimalField(
        max_digits=14, decimal_places=2, min_value=Decimal("0")
    )
    additional_cost = serializers.DecimalField(
        max_digits=14, decimal_places=2, min_value=Decimal("0"), default=0
    )
    received_at = serializers.DateTimeField()
    supplier_name = serializers.CharField(
        max_length=120, required=False, allow_blank=True
    )


class SaleItemInputSerializer(serializers.Serializer):
    product_id = serializers.UUIDField()
    quantity = serializers.DecimalField(
        max_digits=14, decimal_places=3, min_value=Decimal("0.001")
    )
    unit_price = serializers.DecimalField(
        max_digits=14, decimal_places=2, min_value=Decimal("0"), required=False
    )


class SaleCreateSerializer(serializers.Serializer):
    sale_type = serializers.ChoiceField(choices=Sale.SaleType.choices)
    customer_name = serializers.CharField(
        max_length=120, required=False, allow_blank=True
    )
    customer_phone = serializers.CharField(
        max_length=32, required=False, allow_blank=True
    )
    discount = serializers.DecimalField(
        max_digits=14, decimal_places=2, min_value=Decimal("0"), default=0
    )
    payment_status = serializers.ChoiceField(choices=Sale.PaymentStatus.choices)
    sold_at = serializers.DateTimeField()
    items = SaleItemInputSerializer(many=True, min_length=1)


class SaleVoidSerializer(serializers.Serializer):
    reason = serializers.CharField(min_length=3, max_length=240)


class SaleItemSerializer(serializers.ModelSerializer):
    product_name = serializers.CharField(source="product.name", read_only=True)

    class Meta:
        model = SaleItem
        fields = [
            "id",
            "product",
            "product_name",
            "quantity",
            "unit_price",
            "line_total",
            "cost_total",
            "returned_quantity",
        ]


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
            "sale_type",
            "customer_name",
            "customer_phone",
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


class AdjustmentSerializer(serializers.Serializer):
    product_id = serializers.UUIDField()
    kind = serializers.ChoiceField(
        choices=[
            choice
            for choice in InventoryMovement.Kind.choices
            if choice[0]
            not in {
                InventoryMovement.Kind.RECEIPT,
                InventoryMovement.Kind.SALE,
                InventoryMovement.Kind.RETURN,
            }
        ]
    )
    quantity = serializers.DecimalField(
        max_digits=14, decimal_places=3, min_value=Decimal("0.001")
    )
    reason = serializers.CharField(max_length=240)
    occurred_at = serializers.DateTimeField()


class ReturnItemInputSerializer(serializers.Serializer):
    sale_item_id = serializers.UUIDField()
    quantity = serializers.DecimalField(
        max_digits=14, decimal_places=3, min_value=Decimal("0.001")
    )
    condition = serializers.ChoiceField(choices=["sellable", "damaged"])


class ReturnCreateSerializer(serializers.Serializer):
    sale_id = serializers.UUIDField()
    resolution = serializers.ChoiceField(choices=SaleReturn.Resolution.choices)
    reason = serializers.CharField(max_length=240)
    returned_at = serializers.DateTimeField()
    items = ReturnItemInputSerializer(many=True, min_length=1)


class ReturnSerializer(serializers.ModelSerializer):
    receipt_number = serializers.CharField(source="sale.receipt_number", read_only=True)

    class Meta:
        model = SaleReturn
        fields = [
            "id",
            "sale",
            "receipt_number",
            "resolution",
            "reason",
            "total",
            "returned_at",
        ]


class ExpenseSerializer(serializers.ModelSerializer):
    class Meta:
        model = Expense
        fields = [
            "id",
            "category",
            "description",
            "amount",
            "incurred_at",
            "created_at",
        ]
        read_only_fields = ["id", "created_at"]


class BudgetSerializer(serializers.ModelSerializer):
    class Meta:
        model = Budget
        fields = [
            "id",
            "category",
            "month",
            "planned_amount",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]


class DecisionSerializer(serializers.ModelSerializer):
    class Meta:
        model = CommerceDecision
        fields = [
            "id",
            "key",
            "severity",
            "title",
            "explanation",
            "action_path",
            "context",
            "created_at",
        ]


class InventoryMovementSerializer(serializers.ModelSerializer):
    product_name = serializers.CharField(source="product.name", read_only=True)

    class Meta:
        model = InventoryMovement
        fields = [
            "id",
            "product",
            "product_name",
            "kind",
            "quantity_delta",
            "reason",
            "occurred_at",
        ]
