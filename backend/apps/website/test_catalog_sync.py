from decimal import Decimal

from django.test import TestCase
from rest_framework.test import APIClient

from apps.commerce.catalog.models import Product, ProductFamily
from apps.identity.models import User
from apps.workspaces.models import Business

from .catalog_sync import sync_site_catalog
from .models import WebsiteListing, WebsiteSite, WebsiteVariant


class WebsiteCatalogSyncTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.owner = User.objects.create_user(
            email="website-catalog-sync@example.com",
            password="Strong-Password-123!",
        )
        self.business = Business.objects.create(
            name="Catalog Sync Shop",
            public_handle="catalog-sync-shop",
            country_code="TZ",
            created_by=self.owner,
        )
        self.site = WebsiteSite.objects.create(
            business=self.business,
            slug="catalog-sync-shop",
            display_name="Catalog Sync Shop",
            is_published=True,
        )

    def products_url(self):
        return f"/api/public/storefront/sites/{self.site.public_key}/products/"

    def test_family_products_sync_to_one_listing_with_website_owned_prices(self):
        family = ProductFamily.objects.create(
            business=self.business,
            name="iPhone 17 Pro Max",
            brand="Apple",
        )
        silver = Product.objects.create(
            business=self.business,
            family=family,
            name="iPhone 17 Pro Max",
            sku="ITM-000101",
            brand="Apple",
            variant="Silver",
            selling_price=Decimal("4100000"),
            current_quantity=Decimal("2"),
            tracking_mode=Product.TrackingMode.QUANTITY,
            is_active=True,
        )
        orange = Product.objects.create(
            business=self.business,
            family=family,
            name="iPhone 17 Pro Max",
            sku="ITM-000102",
            brand="Apple",
            variant="Cosmic Orange",
            selling_price=Decimal("4350000"),
            current_quantity=Decimal("1"),
            tracking_mode=Product.TrackingMode.QUANTITY,
            is_active=True,
        )

        result = sync_site_catalog(site=self.site, publish_new=True)

        self.assertEqual(result["products"], 2)
        self.assertEqual(result["created_listings"], 1)
        self.assertEqual(result["created_variants"], 2)
        listing = WebsiteListing.objects.get(site=self.site)
        self.assertEqual(listing.title["en"], "iPhone 17 Pro Max")
        self.assertTrue(listing.is_published)
        self.assertEqual(
            {value["value"] for value in listing.options[0]["values"]},
            {"Silver", "Cosmic Orange"},
        )

        variants = list(listing.variants.order_by("sku"))
        self.assertEqual(
            {variant.commerce_product_id for variant in variants},
            {silver.id, orange.id},
        )
        self.assertTrue(all(variant.price_source == WebsiteVariant.Source.WEBSITE for variant in variants))
        self.assertTrue(all(variant.website_price is None for variant in variants))
        self.assertTrue(
            all(
                variant.availability_source == WebsiteVariant.Source.COMMERCE
                for variant in variants
            )
        )

        response = self.client.get(self.products_url())
        self.assertEqual(response.status_code, 200)
        products = response.data["data"]["products"]
        self.assertEqual(len(products), 1)
        self.assertEqual(len(products[0]["skus"]), 2)
        self.assertTrue(all(sku["price"] is None for sku in products[0]["skus"]))
        serialized = str(products)
        self.assertNotIn("4100000", serialized)
        self.assertNotIn("4350000", serialized)

        second = sync_site_catalog(site=self.site, publish_new=True)
        self.assertEqual(second["created_listings"], 0)
        self.assertEqual(second["created_variants"], 0)
        self.assertEqual(second["existing_variants"], 2)

    def test_family_sync_rehomes_duplicate_sku_listings_and_preserves_website_prices(self):
        family = ProductFamily.objects.create(
            business=self.business,
            name="iPhone 17 Pro Max",
            brand="Apple",
        )
        silver = Product.objects.create(
            business=self.business,
            family=family,
            name="iPhone 17 Pro Max",
            sku="ITM-000301",
            brand="Apple",
            variant="Silver",
            current_quantity=Decimal("1"),
            is_active=True,
        )
        orange = Product.objects.create(
            business=self.business,
            family=family,
            name="iPhone 17 Pro Max",
            sku="ITM-000302",
            brand="Apple",
            variant="Cosmic Orange",
            current_quantity=Decimal("1"),
            is_active=True,
        )
        silver_listing = WebsiteListing.objects.create(
            site=self.site,
            slug="iphone-17-pro-max-silver",
            title={"en": "iPhone 17 Pro Max Silver", "sw": "iPhone 17 Pro Max Silver"},
            is_published=True,
        )
        orange_listing = WebsiteListing.objects.create(
            site=self.site,
            slug="iphone-17-pro-max-cosmic-orange",
            title={
                "en": "iPhone 17 Pro Max Cosmic Orange",
                "sw": "iPhone 17 Pro Max Cosmic Orange",
            },
            is_published=True,
        )
        WebsiteVariant.objects.create(
            listing=silver_listing,
            sku=silver.sku,
            commerce_product=silver,
            website_price=Decimal("4200000"),
            availability_source=WebsiteVariant.Source.COMMERCE,
            is_published=True,
        )
        WebsiteVariant.objects.create(
            listing=orange_listing,
            sku=orange.sku,
            commerce_product=orange,
            website_price=Decimal("4400000"),
            availability_source=WebsiteVariant.Source.COMMERCE,
            is_published=True,
        )

        result = sync_site_catalog(site=self.site, publish_new=True)

        self.assertEqual(result["created_listings"], 1)
        self.assertEqual(result["moved_variants"], 2)
        self.assertEqual(result["unpublished_duplicates"], 2)
        canonical = WebsiteListing.objects.get(
            site=self.site,
            title__en="iPhone 17 Pro Max",
        )
        self.assertTrue(canonical.is_published)
        self.assertEqual(canonical.variants.count(), 2)
        self.assertEqual(
            set(canonical.variants.values_list("website_price", flat=True)),
            {Decimal("4200000"), Decimal("4400000")},
        )
        self.assertFalse(
            WebsiteListing.objects.get(pk=silver_listing.pk).is_published
        )
        self.assertFalse(
            WebsiteListing.objects.get(pk=orange_listing.pk).is_published
        )

    def test_website_price_is_public_even_when_legacy_source_says_commerce(self):
        product = Product.objects.create(
            business=self.business,
            name="Anker 35W Charger",
            sku="ITM-000201",
            brand="Anker",
            selling_price=Decimal("65000"),
            current_quantity=Decimal("4"),
            is_active=True,
        )
        listing = WebsiteListing.objects.create(
            site=self.site,
            slug="anker-35w-charger",
            title={"en": "Anker 35W Charger", "sw": "Anker 35W Charger"},
            is_published=True,
        )
        WebsiteVariant.objects.create(
            listing=listing,
            sku=product.sku,
            commerce_product=product,
            website_price=Decimal("72000"),
            price_source=WebsiteVariant.Source.COMMERCE,
            availability_source=WebsiteVariant.Source.COMMERCE,
            is_published=True,
        )

        response = self.client.get(self.products_url())

        self.assertEqual(response.status_code, 200)
        sku = response.data["data"]["products"][0]["skus"][0]
        self.assertEqual(sku["price"]["amount"], "72000.00")
        self.assertNotEqual(sku["price"]["amount"], "65000.00")
