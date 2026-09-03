from decimal import Decimal

from django.test import SimpleTestCase
from rest_framework.exceptions import ValidationError

from ..quantity_rules import is_countable_unit, require_valid_quantity


class CommerceQuantityRuleTests(SimpleTestCase):
    def test_countable_units_require_whole_quantities(self):
        for unit in [
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
            "car",
        ]:
            with self.subTest(unit=unit):
                self.assertTrue(is_countable_unit(unit))
                with self.assertRaises(ValidationError):
                    require_valid_quantity(
                        quantity=Decimal("0.5"), unit=unit, field="quantity"
                    )
                self.assertEqual(
                    require_valid_quantity(
                        quantity=Decimal("2"), unit=unit, field="quantity"
                    ),
                    Decimal("2"),
                )

    def test_measured_units_keep_decimal_precision(self):
        for unit in ["meter", "kilogram", "gram", "liter", "milliliter", "tonne"]:
            with self.subTest(unit=unit):
                self.assertFalse(is_countable_unit(unit))
                self.assertEqual(
                    require_valid_quantity(
                        quantity=Decimal("0.5"), unit=unit, field="quantity"
                    ),
                    Decimal("0.5"),
                )
