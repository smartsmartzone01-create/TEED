from decimal import Decimal

from rest_framework import serializers

from ..catalog.models import Product
from ..quantity_rules import require_valid_quantity
from .models import (
    FinancingAgreement,
    FinancingDocument,
    FinancingItem,
    FinancingPayment,
)


class FinancingItemInputSerializer(serializers.Serializer):
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
        max_digits=14, decimal_places=2, min_value=Decimal("0")
    )
    warranty_months = serializers.ChoiceField(
        choices=FinancingItem.WarrantyMonths.choices,
        required=False,
        allow_null=True,
        default=None,
    )


class FinancingAgreementCreateSerializer(serializers.Serializer):
    agreement_type = serializers.ChoiceField(choices=FinancingAgreement.AgreementType.choices)
    transaction_type = serializers.ChoiceField(
        choices=FinancingAgreement.TransactionType.choices
    )
    source = serializers.ChoiceField(choices=FinancingAgreement.Source.choices)
    market_type = serializers.ChoiceField(choices=FinancingAgreement.MarketType.choices)
    financing_mode = serializers.ChoiceField(
        choices=FinancingAgreement.FinancingMode.choices,
        default=FinancingAgreement.FinancingMode.BUSINESS,
    )
    customer_name = serializers.CharField(max_length=120)
    customer_phone = serializers.CharField(max_length=32, required=False, allow_blank=True)
    customer_region = serializers.CharField(max_length=120, required=False, allow_blank=True)
    contract_total = serializers.DecimalField(
        max_digits=14, decimal_places=2, min_value=Decimal("0.01")
    )
    upfront_cash = serializers.DecimalField(
        max_digits=14, decimal_places=2, min_value=Decimal("0"), default=0
    )
    trade_in_item_name = serializers.CharField(
        max_length=160, required=False, allow_blank=True, default=""
    )
    trade_in_credit = serializers.DecimalField(
        max_digits=14, decimal_places=2, min_value=Decimal("0"), default=0
    )
    installment_amount = serializers.DecimalField(
        max_digits=14, decimal_places=2, min_value=Decimal("0.01")
    )
    frequency = serializers.ChoiceField(choices=FinancingAgreement.Frequency.choices)
    next_due_date = serializers.DateField(required=False, allow_null=True)
    release_threshold_percent = serializers.DecimalField(
        max_digits=5,
        decimal_places=2,
        min_value=Decimal("1"),
        max_value=Decimal("100"),
        default=Decimal("100"),
    )
    partner_name = serializers.CharField(
        max_length=120, required=False, allow_blank=True, default=""
    )
    partner_settlement_amount = serializers.DecimalField(
        max_digits=14,
        decimal_places=2,
        min_value=Decimal("0"),
        required=False,
        allow_null=True,
    )
    business_commission = serializers.DecimalField(
        max_digits=14, decimal_places=2, min_value=Decimal("0"), default=0
    )
    notes = serializers.CharField(max_length=500, required=False, allow_blank=True, default="")
    items = FinancingItemInputSerializer(many=True, min_length=1)

    def validate(self, attrs):
        transaction_type = attrs["transaction_type"]
        if transaction_type == FinancingAgreement.TransactionType.NORMAL:
            attrs["upfront_cash"] = Decimal("0")
            attrs["trade_in_item_name"] = ""
            attrs["trade_in_credit"] = Decimal("0")
        elif transaction_type == FinancingAgreement.TransactionType.UPFRONT:
            attrs["trade_in_item_name"] = ""
            attrs["trade_in_credit"] = Decimal("0")
            if attrs["upfront_cash"] <= 0:
                raise serializers.ValidationError(
                    {"upfront_cash": "Enter the upfront payment for this agreement."}
                )
        elif attrs["trade_in_credit"] <= 0 or not attrs["trade_in_item_name"].strip():
            raise serializers.ValidationError(
                {"trade_in_credit": "Record the trade-in item and its agreed credit."}
            )

        contribution = attrs["upfront_cash"] + attrs["trade_in_credit"]
        if contribution >= attrs["contract_total"]:
            raise serializers.ValidationError(
                {"contract_total": "The financed agreement must leave a positive balance."}
            )
        if attrs["financing_mode"] == FinancingAgreement.FinancingMode.PARTNER:
            if not attrs["partner_name"].strip() or attrs.get("partner_settlement_amount") is None:
                raise serializers.ValidationError(
                    {"partner_name": "Record the financing partner and settlement amount."}
                )
        else:
            attrs["partner_name"] = ""
            attrs["partner_settlement_amount"] = None
            attrs["business_commission"] = Decimal("0")

        business_id = self.context.get("business_id")
        for item in attrs["items"]:
            if attrs["source"] == FinancingAgreement.Source.INDEPENDENT:
                if not item.get("item_name", "").strip():
                    raise serializers.ValidationError(
                        {"items": "Enter a name for every independently acquired product."}
                    )
                item.pop("product_id", None)
                item.pop("tracked_unit_id", None)
                continue

            product_id = item.get("product_id")
            if not product_id:
                raise serializers.ValidationError(
                    {"items": "Choose a Stock product for every financed product."}
                )
            product = Product.objects.filter(
                id=product_id, business_id=business_id, is_active=True
            ).first()
            if product is None:
                raise serializers.ValidationError({"items": "A selected Stock product is unavailable."})
            require_valid_quantity(quantity=item["quantity"], unit=product.unit, field="quantity")
            if product.tracking_mode == Product.TrackingMode.INDIVIDUAL and not item.get("tracked_unit_id"):
                raise serializers.ValidationError(
                    {"items": f"Choose the exact {product.name} item being financed."}
                )
        return attrs


class FinancingPaymentCreateSerializer(serializers.Serializer):
    amount = serializers.DecimalField(
        max_digits=14, decimal_places=2, min_value=Decimal("0.01")
    )
    paid_at = serializers.DateTimeField()
    method = serializers.CharField(max_length=40, required=False, allow_blank=True, default="")
    reference = serializers.CharField(max_length=80, required=False, allow_blank=True, default="")


class FinancingPaymentSerializer(serializers.ModelSerializer):
    class Meta:
        model = FinancingPayment
        fields = ["id", "amount", "paid_at", "method", "reference", "created_at"]


class FinancingItemSerializer(serializers.ModelSerializer):
    product_name = serializers.SerializerMethodField()
    product_sku = serializers.SerializerMethodField()
    product_unit = serializers.CharField(source="product.unit", read_only=True, default="")

    class Meta:
        model = FinancingItem
        fields = [
            "id",
            "product",
            "product_name",
            "product_sku",
            "product_unit",
            "tracked_unit",
            "item_name",
            "item_details",
            "quantity",
            "unit_price",
            "line_total",
            "acquisition_unit_cost",
            "cost_total",
            "warranty_months",
        ]

    def get_product_name(self, obj):
        return obj.product.name if obj.product_id else obj.item_name

    def get_product_sku(self, obj):
        return obj.product.sku if obj.product_id else ""


class FinancingDocumentSerializer(serializers.ModelSerializer):
    download_path = serializers.SerializerMethodField()

    class Meta:
        model = FinancingDocument
        fields = ["id", "original_name", "description", "created_at", "download_path"]

    def get_download_path(self, obj):
        business_id = obj.agreement.business_id
        return (
            f"/api/v1/commerce/businesses/{business_id}/financing/"
            f"{obj.agreement_id}/documents/{obj.id}/download/"
        )


class FinancingAgreementSerializer(serializers.ModelSerializer):
    items = FinancingItemSerializer(many=True, read_only=True)
    payments = FinancingPaymentSerializer(many=True, read_only=True)
    documents = FinancingDocumentSerializer(many=True, read_only=True)
    contribution_total = serializers.SerializerMethodField()
    payments_total = serializers.SerializerMethodField()
    outstanding_balance = serializers.SerializerMethodField()
    expected_business_income = serializers.SerializerMethodField()

    class Meta:
        model = FinancingAgreement
        fields = [
            "id",
            "reference",
            "agreement_type",
            "transaction_type",
            "source",
            "market_type",
            "financing_mode",
            "status",
            "customer_name",
            "customer_phone",
            "customer_region",
            "contract_total",
            "upfront_cash",
            "trade_in_item_name",
            "trade_in_credit",
            "contribution_total",
            "installment_amount",
            "frequency",
            "next_due_date",
            "release_threshold_percent",
            "product_released_at",
            "partner_name",
            "partner_settlement_amount",
            "partner_settlement_received",
            "business_commission",
            "payments_total",
            "outstanding_balance",
            "expected_business_income",
            "notes",
            "items",
            "payments",
            "documents",
            "created_at",
        ]

    def get_contribution_total(self, obj):
        return str(obj.contribution_total)

    def get_payments_total(self, obj):
        return str(obj.payments_total)

    def get_outstanding_balance(self, obj):
        return str(obj.outstanding_balance)

    def get_expected_business_income(self, obj):
        if not self.context.get("show_internal", False):
            return None
        acquisition = sum((item.cost_total for item in obj.items.all()), Decimal("0"))
        settlement = (
            obj.partner_settlement_amount
            if obj.financing_mode == FinancingAgreement.FinancingMode.PARTNER
            and obj.partner_settlement_amount is not None
            else obj.contract_total
        )
        return str(settlement - acquisition + obj.business_commission)

    def to_representation(self, instance):
        data = super().to_representation(instance)
        if not self.context.get("show_internal", False):
            data.pop("partner_name", None)
            data.pop("partner_settlement_amount", None)
            data.pop("partner_settlement_received", None)
            data.pop("business_commission", None)
            data.pop("expected_business_income", None)
            for item in data["items"]:
                item.pop("acquisition_unit_cost", None)
                item.pop("cost_total", None)
        return data
