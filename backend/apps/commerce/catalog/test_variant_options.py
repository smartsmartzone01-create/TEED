from django.test import SimpleTestCase
from rest_framework.exceptions import ValidationError

from .variant_options import (
    normalize_variant_options,
    variant_display_name,
    variant_option_signature,
    variant_option_values,
)


class VariantOptionTests(SimpleTestCase):
    def test_normalizes_general_product_options(self):
        options = normalize_variant_options(
            [
                {"key": "Color", "label": "Color", "value": "Natural Titanium"},
                {"key": "Storage", "label": "Storage", "value": "256 GB"},
            ]
        )

        self.assertEqual(
            options,
            [
                {"key": "color", "label": "Color", "value": "Natural Titanium"},
                {"key": "storage", "label": "Storage", "value": "256 GB"},
            ],
        )
        self.assertEqual(
            variant_option_values(options),
            {"color": "Natural Titanium", "storage": "256 GB"},
        )
        self.assertEqual(
            variant_display_name(options),
            "Natural Titanium · 256 GB",
        )

    def test_signature_is_order_independent_and_case_insensitive(self):
        first = [
            {"key": "size", "label": "Size", "value": "XL"},
            {"key": "color", "label": "Color", "value": "Black"},
        ]
        second = [
            {"key": "COLOR", "label": "Color", "value": "black"},
            {"key": "SIZE", "label": "Size", "value": "xl"},
        ]

        self.assertEqual(
            variant_option_signature(first),
            variant_option_signature(second),
        )

    def test_rejects_duplicate_option_types(self):
        with self.assertRaises(ValidationError):
            normalize_variant_options(
                [
                    {"key": "size", "label": "Size", "value": "42"},
                    {"key": "Size", "label": "Size", "value": "43"},
                ]
            )
