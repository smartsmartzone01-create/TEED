from types import SimpleNamespace

from django.test import SimpleTestCase

from .catalog_sync import (
    _replace_managed_listing_options,
    _structured_family_options,
)


class StructuredCatalogOptionTests(SimpleTestCase):
    def test_builds_general_storefront_axes_from_sku_options(self):
        products = [
            SimpleNamespace(
                variant_options=[
                    {"key": "color", "label": "Color", "value": "Natural Titanium"},
                    {"key": "storage", "label": "Storage", "value": "256 GB"},
                ]
            ),
            SimpleNamespace(
                variant_options=[
                    {"key": "storage", "label": "Storage", "value": "1 TB"},
                    {"key": "color", "label": "Color", "value": "Natural Titanium"},
                ]
            ),
        ]

        options = _structured_family_options(products)

        self.assertEqual([option["id"] for option in options], ["color", "storage"])
        self.assertEqual(options[0]["name"], {"en": "Color", "sw": "Rangi"})
        self.assertEqual(
            [value["value"] for value in options[1]["values"]],
            ["256 GB", "1 TB"],
        )

    def test_requires_one_complete_schema_for_the_family(self):
        products = [
            SimpleNamespace(
                variant_options=[
                    {"key": "size", "label": "Size", "value": "42"},
                ]
            ),
            SimpleNamespace(variant_options=[]),
        ]

        self.assertIsNone(_structured_family_options(products))

    def test_replaces_only_commerce_managed_listing_options(self):
        current = [
            {"id": "variant", "name": {"en": "Variant", "sw": "Aina"}, "values": []},
            {"id": "warranty", "name": {"en": "Warranty", "sw": "Warranty"}, "values": []},
        ]
        incoming = [
            {"id": "screen_size", "name": {"en": "Screen size", "sw": "Ukubwa wa skrini"}, "values": []}
        ]

        result = _replace_managed_listing_options(
            current,
            {"variant", "screen_size"},
            incoming,
        )

        self.assertEqual([option["id"] for option in result], ["warranty", "screen_size"])
