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
)


class ProductSerializer(serializers.ModelSerializer):
    class Meta:
        model = Product
        fields = [
            "id",
            "name",
            "sku",
            "variant",
            "unit",
            "selling_price",
            "low_stock_threshold",
            "current_quantity",
            "is_active",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "current_quantity", "created_at", "updated_at"]


class StockBatchSerializer(serializers.ModelSerializer):
    product_name = serializers.CharField(source="product.name", read_only=True)

    class Meta:
        model = StockBatch
        fields = [
            "id",
            "product",
            "product_name",
            "reference",
            "quantity_received",
            "quantity_remaining",
            "unit_cost",
            "additional_cost",
            "received_at",
            "supplier_name",
            "created_at",
        ]


class StockReceiptSerializer(serializers.Serializer):
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
