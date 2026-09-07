from decimal import Decimal

from rest_framework import serializers
from rest_framework.exceptions import ValidationError

from .serializers import (
    CanonicalStockLineInputSerializer,
    CanonicalStockReceiptCorrectionSerializer,
    CanonicalStockReceiptCreateSerializer,
)

COUNTABLE_UNITS = {
    "piece",
    "pair",
    "packet",
    "box",
    "carton",
    "crate",
    "bottle",
    "can",
    "bag",
    "sack",
    "bundle",
    "set",
    "dozen",
    "roll",
}


def _require_whole(value, unit, message):
    quantity = Decimal(value)
    if (
        unit.strip().casefold() in COUNTABLE_UNITS
        and quantity != quantity.to_integral_value()
    ):
        raise ValidationError(message)


def _validate_line(line, *, status, location):
    quantity = line["quantity_received"]
    conversion = line.get("conversion_to_base", Decimal("1"))
    base_quantity = quantity * conversion
    _require_whole(
        quantity,
        line["received_unit"],
        {location: [f"{line['received_unit']} requires a whole quantity."]},
    )
    if line.get("tracking_mode") == "individual":
        if base_quantity != base_quantity.to_integral_value():
            raise ValidationError(
                {
                    location: [
                        "Individually tracked products must convert to a whole inventory quantity."
                    ]
                }
            )
        if status == "received" and len(line["tracked_units"]) != int(base_quantity):
            raise ValidationError(
                {
                    location: [
                        f"Record all {int(base_quantity)} individual items before receiving the stock."
                    ]
                }
            )


class CanonicalStockLineContractSerializer(CanonicalStockLineInputSerializer):
    conversion_to_base = serializers.DecimalField(
        max_digits=14,
        decimal_places=6,
        min_value=Decimal("0.000001"),
        required=False,
        default=Decimal("1"),
    )


class CanonicalStockReceiptCreateContractSerializer(
    CanonicalStockReceiptCreateSerializer
):
    lines = CanonicalStockLineContractSerializer(
        many=True, required=False, default=list
    )

    def validate(self, attrs):
        attrs = super().validate(attrs)

        for line in attrs.get("lines", []):
            _validate_line(line, status=attrs["status"], location="lines")

        for batch_index, batch in enumerate(attrs.get("batches", []), start=1):
            for group_index, group in enumerate(batch["groups"], start=1):
                _require_whole(
                    group["quantity"],
                    group["unit"],
                    {
                        "batches": [
                            f"Batch {batch_index}, group {group_index}: "
                            f"{group['unit']} requires a whole quantity."
                        ]
                    },
                )
                for product_index, product in enumerate(group["types"], start=1):
                    _require_whole(
                        product["quantity_received"],
                        group["unit"],
                        {
                            "batches": [
                                f"Batch {batch_index}, group {group_index}, product "
                                f"{product_index}: {group['unit']} requires a whole quantity."
                            ]
                        },
                    )
                    if product.get("tracking_mode") == "individual":
                        quantity = product["quantity_received"]
                        if quantity != quantity.to_integral_value():
                            raise ValidationError(
                                {
                                    "batches": [
                                        "Individually tracked products require a whole quantity."
                                    ]
                                }
                            )
                        if attrs["status"] == "received" and len(
                            product["tracked_units"]
                        ) != int(quantity):
                            raise ValidationError(
                                {
                                    "batches": [
                                        "Record every individual item before receiving the stock."
                                    ]
                                }
                            )
        return attrs


class CanonicalStockGroupCorrectionContractSerializer(serializers.Serializer):
    id = serializers.UUIDField()
    name = serializers.CharField(max_length=120, required=False)
    unit = serializers.CharField(max_length=32, required=False)


class CanonicalStockReceiptCorrectionContractSerializer(
    CanonicalStockReceiptCorrectionSerializer
):
    groups = CanonicalStockGroupCorrectionContractSerializer(many=True, required=False)