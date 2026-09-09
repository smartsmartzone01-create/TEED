from decimal import Decimal

from django.test import SimpleTestCase

from .services import (
    _individual_sku_groups,
    _sku_variant_from_unit,
    _split_line_for_units,
)


class AutomaticSkuResolutionTests(SimpleTestCase):
    def test_variant_uses_color_and_capacity(self):
        self.assertEqual(
            _sku_variant_from_unit(
                "",
                {"color": "Deep Blue", "capacity": "256 GB"},
            ),
            "Deep Blue · 256 GB",
        )

    def test_variant_keeps_existing_variant_without_duplicate_parts(self):
        self.assertEqual(
            _sku_variant_from_unit(
                "Unlocked",
                {"color": "Silver", "capacity": "1 TB"},
            ),
            "Unlocked · Silver · 1 TB",
        )

    def test_individual_units_group_by_sellable_configuration(self):
        groups = _individual_sku_groups(
            {
                "quantity_received": Decimal("3"),
                "conversion_to_base": Decimal("1"),
                "tracked_units": [
                    {"color": "Deep Blue", "capacity": "256 GB"},
                    {"color": "Deep Blue", "capacity": "256 GB"},
                    {"color": "Deep Blue", "capacity": "512 GB"},
                ],
            },
            "",
        )

        self.assertEqual(
            [(variant, len(units)) for variant, units in groups],
            [
                ("Deep Blue · 256 GB", 2),
                ("Deep Blue · 512 GB", 1),
            ],
        )

    def test_partial_draft_does_not_split_before_all_units_are_recorded(self):
        groups = _individual_sku_groups(
            {
                "quantity_received": Decimal("3"),
                "conversion_to_base": Decimal("1"),
                "tracked_units": [
                    {"color": "Deep Blue", "capacity": "256 GB"},
                ],
            },
            "",
        )

        self.assertEqual(groups, [])

    def test_split_line_preserves_base_unit_cost(self):
        split = _split_line_for_units(
            {
                "quantity_received": Decimal("1"),
                "conversion_to_base": Decimal("2"),
                "received_unit": "pair",
                "unit_cost": Decimal("200.00"),
                "tracked_units": [],
            },
            [{"color": "Black", "capacity": ""}],
            "piece",
        )

        self.assertEqual(split["quantity_received"], Decimal("1"))
        self.assertEqual(split["conversion_to_base"], Decimal("1"))
        self.assertEqual(split["received_unit"], "piece")
        self.assertEqual(split["unit_cost"], Decimal("100.00"))
