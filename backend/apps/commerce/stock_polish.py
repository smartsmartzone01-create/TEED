from datetime import timedelta
from decimal import Decimal

from common.responses import SuccessResponse
from django.db import transaction
from django.db.models import F
from django.utils import timezone
from django.utils.decorators import method_decorator
from django.views.decorators.csrf import csrf_protect
from rest_framework import serializers, status
from rest_framework.exceptions import ValidationError

from apps.workspaces.policy import WorkspacePermission

from .api import CommerceBaseAPIView
from .models import InventoryMovement, Product, StockBatch, StockReceipt, StockReceiptAudit, UnitDefinition
from .serializers import ProductSerializer, StockReceiptCreateSerializer, StockReceiptSerializer, UnitDefinitionSerializer
from .services import _sync_stock_expense, commerce_membership, create_product, create_stock_receipt, refresh_decisions

CORRECTION_WINDOW = timedelta(hours=48)
COUNTABLE_UNITS = {
    "piece", "pair", "packet", "box", "carton", "crate", "bottle", "can",
    "bag", "sack", "bundle", "set", "dozen", "roll",
}


def _normalized_decimal(value):
    value = Decimal(value)
    if value == value.to_integral_value():
        return format(value.quantize(Decimal("1")), "f")
    return format(value.normalize(), "f")


def _is_countable(unit):
    return (unit or "").strip().casefold() in COUNTABLE_UNITS


def _require_whole_quantity(*, quantity, unit, field):
    quantity = Decimal(quantity)
    if _is_countable(unit) and quantity != quantity.to_integral_value():
        raise ValidationError(
            {field: [f"{unit.title()} is a countable unit. Enter a whole number, for example 2 instead of 2.5."]}
        )


def _correction_deadline(receipt):
    return receipt.created_at + CORRECTION_WINDOW


def _assert_receipt_editable(receipt):
    if receipt.status == StockReceipt.Status.ARCHIVED:
        raise ValidationError({"receipt": ["Archived stock is read-only."]})
    if receipt.status == StockReceipt.Status.RECEIVED and timezone.now() > _correction_deadline(receipt):
        raise ValidationError(
            {
                "receipt": [
                    "The 48-hour stock correction window has closed. Use Add late delivery for goods that arrived later, or record a governed inventory correction instead of rewriting this receipt."
                ]
            }
        )


class AvailabilityProductSerializer(ProductSerializer):
    current_quantity = serializers.SerializerMethodField()

    def get_current_quantity(self, obj):
        return _normalized_decimal(obj.current_quantity)


class PolishedStockReceiptSerializer(StockReceiptSerializer):
    correction_open = serializers.SerializerMethodField()
    correction_deadline = serializers.SerializerMethodField()

    class Meta(StockReceiptSerializer.Meta):
        fields = [*StockReceiptSerializer.Meta.fields, "correction_open", "correction_deadline"]

    def get_correction_open(self, obj):
        if obj.status == StockReceipt.Status.DRAFT:
            return True
        return obj.status == StockReceipt.Status.RECEIVED and timezone.now() <= _correction_deadline(obj)

    def get_correction_deadline(self, obj):
        return _correction_deadline(obj) if obj.status == StockReceipt.Status.RECEIVED else None


class PolishedStockReceiptCreateSerializer(StockReceiptCreateSerializer):
    def validate(self, attrs):
        attrs = super().validate(attrs)
        business_id = self.context.get("business_id")
        catalog_units = {}
        product_ids = [
            item["product_id"] for item in attrs.get("catalog_items", []) if item.get("product_id")
        ]
        existing_units = dict(
            Product.objects.filter(id__in=product_ids, business_id=business_id).values_list("id", "unit")
        )
        for item in attrs.get("catalog_items", []):
            catalog_units[item["key"]] = (
                existing_units.get(item.get("product_id"), "")
                if item.get("product_id")
                else item.get("item", {}).get("unit", "")
            )

        for batch_index, batch in enumerate(attrs["batches"], start=1):
            for group_index, group in enumerate(batch.get("groups", []), start=1):
                if _is_countable(group["unit"]) and group["quantity"] != group["quantity"].to_integral_value():
                    raise ValidationError(
                        {"batches": [f"Batch {batch_index}, group {group_index}: {group['unit']} requires a whole quantity."]}
                    )
                for type_index, line in enumerate(group.get("types", []), start=1):
                    unit = line.get("received_unit") or group["unit"]
                    if _is_countable(unit) and line["quantity_received"] != line["quantity_received"].to_integral_value():
                        raise ValidationError(
                            {"batches": [f"Batch {batch_index}, group {group_index}, product {type_index}: {unit} requires a whole quantity."]}
                        )
            for line_index, line in enumerate(batch.get("products", []), start=1):
                unit = line.get("received_unit") or catalog_units.get(line.get("catalog_key"), "")
                if not unit and line.get("product_id"):
                    unit = Product.objects.filter(id=line["product_id"], business_id=business_id).values_list("unit", flat=True).first() or ""
                if _is_countable(unit) and line["quantity_received"] != line["quantity_received"].to_integral_value():
                    raise ValidationError(
                        {"batches": [f"Batch {batch_index}, product {line_index}: {unit} requires a whole quantity."]}
                    )
        return attrs


class ProductCorrectionSerializer(serializers.ModelSerializer):
    class Meta:
        model = Product
        fields = [
            "name", "barcode", "group", "brand", "variant", "unit", "selling_price",
            "tracking_mode", "low_stock_threshold", "is_active",
        ]


class StockLineCorrectionSerializer(serializers.Serializer):
    id = serializers.UUIDField()
    quantity = serializers.DecimalField(max_digits=14, decimal_places=3, min_value=Decimal("0.001"), required=False)
    unit = serializers.CharField(max_length=32, required=False)
    name = serializers.CharField(max_length=120, required=False)
    brand = serializers.CharField(max_length=80, required=False, allow_blank=True)
    variant = serializers.CharField(max_length=120, required=False, allow_blank=True)
    barcode = serializers.CharField(max_length=80, required=False, allow_blank=True)


class StockReceiptCorrectionSerializer(serializers.Serializer):
    supplier_name = serializers.CharField(max_length=120, required=False, allow_blank=True)
    additional_cost = serializers.DecimalField(max_digits=14, decimal_places=2, min_value=Decimal("0"), required=False)
    notes = serializers.CharField(max_length=300, required=False, allow_blank=True)
    lines = StockLineCorrectionSerializer(many=True, required=False)


@transaction.atomic
def correct_stock_receipt(*, actor, business_id, receipt_id, lines=None, **values):
    membership = commerce_membership(
        user=actor, business_id=business_id, permission=WorkspacePermission.MANAGE_INVENTORY
    )
    receipt = (
        StockReceipt.objects.select_for_update()
        .filter(id=receipt_id, business=membership.business)
        .first()
    )
    if receipt is None:
        raise ValidationError({"receipt": ["Stock receipt not found."]})
    _assert_receipt_editable(receipt)

    before = {
        "supplier_name": receipt.supplier_name,
        "additional_cost": str(receipt.additional_cost),
        "notes": receipt.notes,
        "lines": [],
    }
    after = {"lines": []}

    for field, value in values.items():
        setattr(receipt, field, value)
    if values:
        receipt.save(update_fields=[*values.keys(), "updated_at"])

    for correction in lines or []:
        line = (
            StockBatch.objects.select_for_update()
            .select_related("product", "stock_group")
            .filter(id=correction["id"], receipt=receipt)
            .first()
        )
        if line is None:
            raise ValidationError({"lines": ["Select a stock item from this receipt."]})

        product = Product.objects.select_for_update().get(pk=line.product_id)
        old_received = line.quantity_received
        old_remaining = line.quantity_remaining
        old_unit = line.received_unit or product.unit
        consumed = max(Decimal("0"), old_received - old_remaining)
        before["lines"].append(
            {
                "id": str(line.id),
                "product": product.name,
                "quantity_received": str(old_received),
                "quantity_remaining": str(old_remaining),
                "unit": old_unit,
                "brand": product.brand,
                "variant": product.variant,
                "barcode": product.barcode,
            }
        )

        product_fields = []
        for field in ["name", "brand", "variant", "barcode"]:
            if field in correction:
                setattr(product, field, correction[field])
                product_fields.append(field)

        new_unit = correction.get("unit", old_unit).strip()
        if new_unit.casefold() != old_unit.casefold():
            if line.stock_group_id:
                raise ValidationError({"lines": [f"{product.name}: grouped stock units cannot be rewritten from one item line."]})
            if consumed > 0 or line.movements.exclude(kind=InventoryMovement.Kind.RECEIPT).exists():
                raise ValidationError({"lines": [f"{product.name}: the unit cannot be changed because this stock already has dependent activity."]})
            if product.stock_batches.exclude(pk=line.pk).exists():
                raise ValidationError({"lines": [f"{product.name}: the unit is already used by other stock receipts."]})
            if line.conversion_to_base != Decimal("1"):
                raise ValidationError({"lines": [f"{product.name}: converted units require a governed inventory correction."]})
            line.received_unit = new_unit
            product.unit = new_unit
            product_fields.append("unit")

        if product_fields:
            product.save(update_fields=[*set(product_fields), "updated_at"])

        quantity = correction.get("quantity")
        if quantity is not None:
            _require_whole_quantity(quantity=quantity, unit=new_unit, field="lines")
            new_received = quantity * line.conversion_to_base
            if line.tracking_mode == Product.TrackingMode.INDIVIDUAL:
                if new_received != new_received.to_integral_value():
                    raise ValidationError({"lines": [f"{product.name}: individual items require a whole quantity."]})
                tracked_count = line.tracked_units.count()
                if tracked_count != int(new_received):
                    raise ValidationError({"lines": [f"{product.name}: quantity must match the {tracked_count} individual item records already saved."]})
            if new_received < consumed:
                raise ValidationError({"lines": [f"{product.name}: quantity cannot be reduced below {consumed}, because that amount has already left available stock."]})
            if line.stock_group_id:
                if line.stock_group.type_lines.exclude(pk=line.pk).exists():
                    raise ValidationError({"lines": [f"{product.name}: correct the complete group rather than one product line."]})
                line.stock_group.quantity = quantity
                line.stock_group.save(update_fields=["quantity", "updated_at"])

            delta = new_received - old_received
            line.quantity_received = new_received
            if receipt.status == StockReceipt.Status.RECEIVED:
                line.quantity_remaining = old_remaining + delta
                if line.quantity_remaining < 0:
                    raise ValidationError({"lines": [f"{product.name}: this correction would create negative available stock."]})
                if delta:
                    Product.objects.filter(pk=product.pk).update(current_quantity=F("current_quantity") + delta)
                    InventoryMovement.objects.create(
                        business=membership.business,
                        product=product,
                        batch=line,
                        kind=InventoryMovement.Kind.CORRECTION,
                        quantity_delta=delta,
                        occurred_at=timezone.now(),
                        reason=f"Human-error correction to {receipt.reference} within the 48-hour correction window.",
                        recorded_by=actor,
                    )
            else:
                line.quantity_remaining = Decimal("0")

        line.save()
        product.refresh_from_db()
        after["lines"].append(
            {
                "id": str(line.id),
                "product": product.name,
                "quantity_received": str(line.quantity_received),
                "quantity_remaining": str(line.quantity_remaining),
                "unit": line.received_unit or product.unit,
                "brand": product.brand,
                "variant": product.variant,
                "barcode": product.barcode,
            }
        )

    if receipt.status == StockReceipt.Status.RECEIVED:
        _sync_stock_expense(receipt=receipt, actor=actor)
    after.update(
        {
            "supplier_name": receipt.supplier_name,
            "additional_cost": str(receipt.additional_cost),
            "notes": receipt.notes,
        }
    )
    if values or lines:
        StockReceiptAudit.objects.create(
            receipt=receipt, actor=actor, action="edit_details", before=before, after=after
        )
    refresh_decisions(business=membership.business)
    return receipt


class ProductListCreatePolishAPIView(CommerceBaseAPIView):
    def get(self, request, business_id):
        membership = commerce_membership(user=request.user, business_id=business_id)
        products = Product.objects.filter(business=membership.business)
        return SuccessResponse(
            message="Products retrieved successfully.",
            data={"products": AvailabilityProductSerializer(products, many=True).data},
        )

    @method_decorator(csrf_protect)
    def post(self, request, business_id):
        serializer = ProductSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        product = create_product(
            actor=request.user, business_id=business_id, **serializer.validated_data
        )
        return SuccessResponse(
            message="Product created successfully.",
            data=AvailabilityProductSerializer(product).data,
            status_code=status.HTTP_201_CREATED,
        )


class ProductDetailPolishAPIView(CommerceBaseAPIView):
    @method_decorator(csrf_protect)
    def patch(self, request, business_id, product_id):
        membership = commerce_membership(
            user=request.user, business_id=business_id, permission=WorkspacePermission.MANAGE_CATALOG
        )
        product = Product.objects.filter(id=product_id, business=membership.business).first()
        if product is None:
            raise ValidationError({"product": ["Item not found."]})
        serializer = ProductCorrectionSerializer(product, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        new_unit = serializer.validated_data.get("unit", product.unit)
        if new_unit.casefold() != product.unit.casefold() and (
            product.stock_batches.exists() or product.movements.exists() or product.sale_items.exists()
        ):
            raise ValidationError(
                {"unit": ["This item already has stock history. Correct its unit from the original stock receipt while that receipt is inside its 48-hour correction window."]}
            )
        if serializer.validated_data.get("is_active") is False and product.current_quantity > 0:
            raise ValidationError({"is_active": ["An item with available stock cannot be archived."]})
        product = serializer.save()
        return SuccessResponse(
            message="Available item corrected successfully.",
            data=AvailabilityProductSerializer(product).data,
        )


class StockReceiptListCreatePolishAPIView(CommerceBaseAPIView):
    def get(self, request, business_id):
        membership = commerce_membership(user=request.user, business_id=business_id)
        receipts = StockReceipt.objects.prefetch_related(
            "lines__product",
            "lines__tracked_units",
            "batches__groups__type_lines__product",
            "batches__groups__type_lines__tracked_units",
            "late_deliveries__lines__product",
            "late_deliveries__lines__tracked_units",
            "late_deliveries__batches__groups__type_lines__product",
            "late_deliveries__batches__groups__type_lines__tracked_units",
        ).filter(business=membership.business, parent_receipt__isnull=True)
        return SuccessResponse(
            message="Stock received retrieved successfully.",
            data={
                "receipts": PolishedStockReceiptSerializer(receipts, many=True).data,
                "units": UnitDefinitionSerializer(
                    UnitDefinition.objects.filter(business=membership.business), many=True
                ).data,
            },
        )

    @method_decorator(csrf_protect)
    def post(self, request, business_id):
        serializer = PolishedStockReceiptCreateSerializer(
            data=request.data, context={"business_id": business_id}
        )
        serializer.is_valid(raise_exception=True)
        receipt = create_stock_receipt(
            actor=request.user, business_id=business_id, **serializer.validated_data
        )
        receipt = StockReceipt.objects.prefetch_related(
            "lines__product",
            "lines__tracked_units",
            "batches__groups__type_lines__product",
            "batches__groups__type_lines__tracked_units",
        ).get(pk=receipt.pk)
        return SuccessResponse(
            message="Stock draft saved successfully." if receipt.status == StockReceipt.Status.DRAFT else "Stock received successfully.",
            data=PolishedStockReceiptSerializer(receipt).data,
            status_code=status.HTTP_201_CREATED,
        )


class StockReceiptDetailPolishAPIView(CommerceBaseAPIView):
    @method_decorator(csrf_protect)
    def patch(self, request, business_id, receipt_id):
        serializer = StockReceiptCorrectionSerializer(data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        receipt = correct_stock_receipt(
            actor=request.user, business_id=business_id, receipt_id=receipt_id, **serializer.validated_data
        )
        return SuccessResponse(
            message="Stock correction saved successfully.",
            data=PolishedStockReceiptSerializer(receipt).data,
        )
