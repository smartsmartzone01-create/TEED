from decimal import Decimal

from rest_framework.exceptions import ValidationError


COUNTABLE_UNITS = {
    "item",
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

MEASURED_UNITS = {
    "meter",
    "kilogram",
    "gram",
    "liter",
    "milliliter",
    "tonne",
}


def normalize_unit(unit):
    return (unit or "").strip().casefold()


def is_countable_unit(unit):
    return normalize_unit(unit) in COUNTABLE_UNITS


def quantity_step_for_unit(unit):
    return Decimal("1") if is_countable_unit(unit) else Decimal("0.001")


def require_valid_quantity(*, quantity, unit, field="quantity"):
    quantity = Decimal(quantity)
    if is_countable_unit(unit) and quantity != quantity.to_integral_value():
        label = (unit or "Item").strip().title() or "Item"
        raise ValidationError(
            {
                field: [
                    f"{label} is a countable unit. Enter a whole number, "
                    "for example 2 instead of 2.5."
                ]
            }
        )
    return quantity


__all__ = [
    "COUNTABLE_UNITS",
    "MEASURED_UNITS",
    "is_countable_unit",
    "normalize_unit",
    "quantity_step_for_unit",
    "require_valid_quantity",
]
