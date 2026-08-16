from decimal import Decimal

from rest_framework import serializers
from rest_framework.exceptions import ValidationError

from .serializers import (
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
    if unit.strip().casefold() in COUNTABLE_UNITS and quantity != quantity.to_integral_value():
        raise ValidationError(message)


class CanonicalStockReceiptCreateContractSerializer(CanonicalStockReceiptCreateSerializer):
    def validate(self, attrs):
        attrs = super().validate(attrs)
        for batch_index, batch in enumerate(attrs["batches"], start=1):
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
                    if product["tracking_mode"] == "individual":
                        quantity = product["quantity_received"]
                        if quantity != quantity.to_integral_value():
                            raise ValidationError(
                                {
                                    "batches": [
                                        "Individually tracked products require a whole quantity."
                                    ]
                                }
                            )
                        if attrs["status"] == "received" and len(product["tracked_units"]) != int(quantity):
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
