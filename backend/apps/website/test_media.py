from uuid import uuid4

from django.core.exceptions import ValidationError
from django.test import SimpleTestCase

from .models import WebsiteListing, WebsiteMedia, WebsiteVariant


class WebsiteMediaModelTests(SimpleTestCase):
    def test_media_requires_locale_map_alt_text(self):
        media = WebsiteMedia(
            site_id=uuid4(),
            public_url="https://cdn.example.com/product.webp",
            alt_text="not-a-map",
        )

        with self.assertRaises(ValidationError):
            media.clean()

    def test_listing_prefers_managed_media_and_falls_back_to_legacy_url(self):
        site_id = uuid4()
        media = WebsiteMedia(
            site_id=site_id,
            public_url="https://cdn.example.com/managed.webp",
        )
        listing = WebsiteListing(
            site_id=site_id,
            slug="phone",
            title={"en": "Phone", "sw": "Simu"},
            primary_image_url="https://legacy.example.com/phone.webp",
            primary_media=media,
        )

        self.assertEqual(
            listing.resolved_primary_image_url(),
            "https://cdn.example.com/managed.webp",
        )

        listing.primary_media = None
        self.assertEqual(
            listing.resolved_primary_image_url(),
            "https://legacy.example.com/phone.webp",
        )

    def test_listing_rejects_media_from_another_site(self):
        listing = WebsiteListing(
            site_id=uuid4(),
            slug="phone",
            title={"en": "Phone", "sw": "Simu"},
            primary_media=WebsiteMedia(
                site_id=uuid4(),
                public_url="https://cdn.example.com/phone.webp",
            ),
        )

        with self.assertRaises(ValidationError):
            listing.clean()

    def test_variant_prefers_managed_media_and_rejects_cross_site_media(self):
        site_id = uuid4()
        listing = WebsiteListing(
            site_id=site_id,
            slug="phone",
            title={"en": "Phone", "sw": "Simu"},
        )
        variant = WebsiteVariant(
            listing=listing,
            sku="PHONE-BLACK",
            image_url="https://legacy.example.com/black.webp",
            media=WebsiteMedia(
                site_id=site_id,
                public_url="https://cdn.example.com/black.webp",
            ),
        )

        self.assertEqual(
            variant.resolved_image_url(),
            "https://cdn.example.com/black.webp",
        )

        variant.media = WebsiteMedia(
            site_id=uuid4(),
            public_url="https://cdn.example.com/other.webp",
        )
        with self.assertRaises(ValidationError):
            variant.clean()
