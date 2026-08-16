from decimal import Decimal

from rest_framework import serializers

from ..catalog.models import Product, UnitDefinition
from ..models import (
    StockBatch,
    StockContainer,
    StockGroup,
    StockReceipt,
    TrackedUnit,
    TrackedUnitIdentifier,
)
from ..serializers import ProductSerializer


class StockIdentifierInputSerializer(serializers.Serializer):
    kind = serializers.ChoiceField(choices=TrackedUnitIdentifier.Kind.choices)
    value = serializers.CharField(max_length=160)


class StockTrackedUnitInputSerializer(serializers.Serializer):
    model_name = serializers.CharField(max_length=120, required=False, allow_blank=True)
    brand = serializers.CharField(max_length=80, required=False, allow_blank=True)
    color = serializers.CharField(max_length=60, required=False, allow_blank=True)
    capacity = serializers.CharField(max_length=80, required=False, allow_blank=True)
    identifiers = StockIdentifierInputSerializer(
        many=True, required=False, default=list
    )


class StockCatalogItemInputSerializer(serializers.Serializer):
    key = serializers.CharField(max_length=80)
    product_id = serializers.UUIDField(required=False)
    item = ProductSerializer(required=False)

    def validate(self, attrs):
        if bool(attrs.get("product_id")) == bool(attrs.get("item")):
            raise serializers.ValidationError(
                "Choose an existing product or enter a new product identification."
            )
        return attrs


class CanonicalStockLineInputSerializer(serializers.Serializer):
    catalog_key = serializers.CharField(max_length=80)
    quantity_received = serializers.DecimalField(
        max_digits=14, decimal_places=3, min_value=Decimal("0.001")
    )
    received_unit = serializers.CharField(max_length=32)
    unit_cost = serializers.DecimalField(
        max_digits=14,
        decimal_places=2,
        min_value=Decimal("0"),
        required=False,
        allow_null=True,
    )
    tracking_mode = serializers.ChoiceField(
        choices=Product.TrackingMode.choices, default=Product.TrackingMode.QUANTITY
    )
    tracked_units = StockTrackedUnitInputSerializer(
        many=True, required=False, default=list
    )


class CanonicalStockGroupInputSerializer(serializers.Serializer):
    name = serializers.CharField(max_length=120)
    quantity = serializers.DecimalField(
        max_digits=14, decimal_places=3, min_value=Decimal("0.001")
    )
    unit = serializers.CharField(max_length=32)
    custom_unit_name = serializers.CharField(
        max_length=32, required=False, allow_blank=True, write_only=True
    )
    types = CanonicalStockLineInputSerializer(many=True, min_length=1)

    def validate(self, attrs):
        product_total = sum(
            (item["quantity_received"] for item in attrs["types"]), Decimal("0")
        )
        if product_total != attrs["quantity"]:
            raise serializers.ValidationError(
                "Product quantities must equal the group quantity."
            )
        for item in attrs["types"]:
            if item["received_unit"].casefold() != attrs["unit"].casefold():
                raise serializers.ValidationError(
                    "Every product in a group must use the group unit."
                )
        return attrs


class CanonicalStockBatchInputSerializer(serializers.Serializer):
    name = serializers.CharField(max_length=120)
    groups = CanonicalStockGroupInputSerializer(many=True, min_length=1)


class CanonicalStockReceiptCreateSerializer(serializers.Serializer):
    parent_receipt_id = serializers.UUIDField(required=False, allow_null=True)
    status = serializers.ChoiceField(
        choices=[StockReceipt.Status.DRAFT, StockReceipt.Status.RECEIVED],
        default=StockReceipt.Status.RECEIVED,
    )
    supplier_name = serializers.CharField(
        max_length=120, required=False, allow_blank=True
    )
    additional_cost = serializers.DecimalField(
        max_digits=14, decimal_places=2, min_value=Decimal("0"), default=0
    )
    received_at = serializers.DateTimeField(required=False, allow_null=True)
    catalog_items = StockCatalogItemInputSerializer(many=True, min_length=1)
    batches = CanonicalStockBatchInputSerializer(many=True, min_length=1)

    def validate(self, attrs):
        keys = [item["key"] for item in attrs["catalog_items"]]
        if len(keys) != len(set(keys)):
            raise serializers.ValidationError(
                {"catalog_items": "Product identification keys must be unique."}
            )
        known = set(keys)
        for batch in attrs["batches"]:
            for group in batch["groups"]:
                for line in group["types"]:
                    if line["catalog_key"] not in known:
                        raise serializers.ValidationError(
                            {
                                "catalog_items": "A stock product uses an unknown identification."
                            }
                        )
        if attrs["status"] == StockReceipt.Status.RECEIVED and not attrs.get(
            "received_at"
        ):
            raise serializers.ValidationError(
                {"received_at": "Enter the date received."}
            )
        return attrs


class StockTrackedUnitSerializer(serializers.ModelSerializer):
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
            "identifiers",
        ]

    def get_identifiers(self, obj):
        return [
            {
                "id": str(identifier.id),
                "kind": identifier.kind,
                "value": identifier.value,
            }
            for identifier in obj.identifiers.all()
        ]


class CanonicalStockLineSerializer(serializers.ModelSerializer):
    product_name = serializers.CharField(source="product.name", read_only=True)
    product_sku = serializers.CharField(source="product.sku", read_only=True)
    product_brand = serializers.CharField(source="product.brand", read_only=True)
    product_variant = serializers.CharField(source="product.variant", read_only=True)
    product_barcode = serializers.CharField(source="product.barcode", read_only=True)
    received_unit_cost = serializers.SerializerMethodField()
    total_buying_cost = serializers.SerializerMethodField()
    tracked_units = StockTrackedUnitSerializer(many=True, read_only=True)

    class Meta:
        model = StockBatch
        fields = [
            "id",
            "product",
            "product_name",
            "product_sku",
            "product_brand",
            "product_variant",
            "product_barcode",
            "tracking_mode",
            "quantity_received",
            "quantity_remaining",
            "received_unit",
            "conversion_to_base",
            "unit_cost",
            "received_unit_cost",
            "total_buying_cost",
            "tracked_units",
        ]

    def get_received_unit_cost(self, obj):
        if obj.unit_cost is None:
            return None
        return str((obj.unit_cost * obj.conversion_to_base).quantize(Decimal("0.01")))

    def get_total_buying_cost(self, obj):
        if obj.unit_cost is None:
            return None
        return str((obj.quantity_received * obj.unit_cost).quantize(Decimal("0.01")))


class CanonicalStockGroupSerializer(serializers.ModelSerializer):
    types = serializers.SerializerMethodField()

    class Meta:
        model = StockGroup
        fields = ["id", "code", "name", "quantity", "unit", "types"]

    def get_types(self, obj):
        return CanonicalStockLineSerializer(obj.type_lines.all(), many=True).data


class CanonicalStockBatchSerializer(serializers.ModelSerializer):
    groups = CanonicalStockGroupSerializer(many=True, read_only=True)

    class Meta:
        model = StockContainer
        fields = ["id", "code", "name", "groups"]


class CanonicalStockReceiptSerializer(serializers.ModelSerializer):
    batches = CanonicalStockBatchSerializer(many=True, read_only=True)
    late_deliveries = serializers.SerializerMethodField()
    product_type_count = serializers.SerializerMethodField()
    quantities_by_unit = serializers.SerializerMethodField()
    total_buying_value = serializers.SerializerMethodField()
    correction_open = serializers.SerializerMethodField()
    correction_deadline = serializers.SerializerMethodField()

    class Meta:
        model = StockReceipt
        fields = [
            "id",
            "parent_receipt",
            "reference",
            "status",
            "supplier_name",
            "additional_cost",
            "received_at",
            "created_at",
            "batches",
            "late_deliveries",
            "product_type_count",
            "quantities_by_unit",
            "total_buying_value",
            "correction_open",
            "correction_deadline",
        ]

    def get_late_deliveries(self, obj):
        if not self.context.get("include_late_deliveries", True):
            return []
        return CanonicalStockReceiptSerializer(
            obj.late_deliveries.all(),
            many=True,
            context={**self.context, "include_late_deliveries": False},
        ).data

    def get_product_type_count(self, obj):
        return len({line.product_id for line in obj.lines.all()})

    def get_quantities_by_unit(self, obj):
        quantities = {}
        for line in obj.lines.all():
            conversion = line.conversion_to_base or Decimal("1")
            quantity = line.quantity_received / conversion
            unit = line.received_unit or line.product.unit
            quantities[unit] = quantities.get(unit, Decimal("0")) + quantity
        return [
            {"unit": unit, "quantity": format(quantity.normalize(), "f")}
            for unit, quantity in sorted(quantities.items())
        ]

    def get_total_buying_value(self, obj):
        return str(
            sum(
                (
                    line.quantity_received * (line.unit_cost or Decimal("0"))
                    for line in obj.lines.all()
                ),
                Decimal("0"),
            ).quantize(Decimal("0.01"))
        )

    def get_correction_open(self, obj):
        from .stock import _correction_deadline

        if obj.status == StockReceipt.Status.DRAFT:
            return True
        from django.utils import timezone

        return (
            obj.status == StockReceipt.Status.RECEIVED
            and timezone.now() <= _correction_deadline(obj)
        )

    def get_correction_deadline(self, obj):
        from .stock import _correction_deadline

        return (
            _correction_deadline(obj)
            if obj.status == StockReceipt.Status.RECEIVED
            else None
        )


class StockBatchNameCorrectionSerializer(serializers.Serializer):
    id = serializers.UUIDField()
    name = serializers.CharField(max_length=120)


class StockGroupNameCorrectionSerializer(serializers.Serializer):
    id = serializers.UUIDField()
    name = serializers.CharField(max_length=120)


class CanonicalStockLineCorrectionSerializer(serializers.Serializer):
    id = serializers.UUIDField()
    quantity = serializers.DecimalField(
        max_digits=14,
        decimal_places=3,
        min_value=Decimal("0.001"),
        required=False,
    )
    unit = serializers.CharField(max_length=32, required=False)
    unit_cost = serializers.DecimalField(
        max_digits=14,
        decimal_places=2,
        min_value=Decimal("0"),
        required=False,
        allow_null=True,
    )
    name = serializers.CharField(max_length=120, required=False)
    brand = serializers.CharField(max_length=80, required=False, allow_blank=True)
    variant = serializers.CharField(max_length=120, required=False, allow_blank=True)
    barcode = serializers.CharField(max_length=80, required=False, allow_blank=True)


class CanonicalStockReceiptCorrectionSerializer(serializers.Serializer):
    supplier_name = serializers.CharField(
        max_length=120, required=False, allow_blank=True
    )
    additional_cost = serializers.DecimalField(
        max_digits=14,
        decimal_places=2,
        min_value=Decimal("0"),
        required=False,
    )
    batches = StockBatchNameCorrectionSerializer(many=True, required=False)
    groups = StockGroupNameCorrectionSerializer(many=True, required=False)
    lines = CanonicalStockLineCorrectionSerializer(many=True, required=False)


class CanonicalUnitDefinitionSerializer(serializers.ModelSerializer):
    class Meta:
        model = UnitDefinition
        fields = ["id", "code", "name"]
