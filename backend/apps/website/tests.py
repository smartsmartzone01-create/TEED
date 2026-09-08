from decimal import Decimal

from django.core.exceptions import ValidationError as DjangoValidationError
from django.test import TestCase
from django.utils import timezone
from rest_framework.test import APIClient

from apps.commerce.catalog.models import Product
from apps.commerce.inventory.models import StockBatch, StockReceipt, TrackedUnit
from apps.identity.models import User
from apps.workspaces.models import Business

from .models import WebsiteListing, WebsiteSite, WebsiteVariant


class PublicStorefrontTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.owner = User.objects.create_user(
            email="storefront-tests@example.com",
            password="Strong-Password-123!",
        )
        self.business = Business.objects.create(
            name="Storefront Test Shop",
            public_handle="storefront-test-shop",
            country_code="TZ",
            created_by=self.owner,
        )
        self.site = WebsiteSite.objects.create(
            business=self.business,
            slug="storefront-test-shop",
            display_name="Storefront Test Shop",
            is_published=True,
        )
        self.listing = WebsiteListing.objects.create(
            site=self.site,
            slug="test-product",
            title={"en": "Test product", "sw": "Bidhaa ya majaribio"},
            short_description={"en": "Public test listing", "sw": "Orodha ya majaribio"},
            description={"en": "Public test listing", "sw": "Orodha ya majaribio"},
            is_published=True,
        )

    def site_url(self):
        return f"/api/public/storefront/sites/{self.site.public_key}/"

    def products_url(self):
        return f"{self.site_url()}products/"

    def product_url(self):
        return f"{self.products_url()}{self.listing.slug}/"

    def create_quantity_product(self, *, quantity="5", threshold="0"):
        return Product.objects.create(
            business=self.business,
            name="USB-C Charger",
            sku="TEST-CHARGER",
            unit="piece",
            selling_price=Decimal("45000"),
            tracking_mode=Product.TrackingMode.QUANTITY,
            current_quantity=Decimal(quantity),
            low_stock_threshold=Decimal(threshold),
            is_active=True,
        )

    def create_commerce_variant(self, product, *, listing=None, is_published=True):
        return WebsiteVariant.objects.create(
            listing=listing or self.listing,
            commerce_product=product,
            price_source=WebsiteVariant.Source.COMMERCE,
            availability_source=WebsiteVariant.Source.COMMERCE,
            is_published=is_published,
        )

    def create_individual_stock(self, product, units):
        receipt = StockReceipt.objects.create(
            business=self.business,
            reference="MZIGO-TEST-0001",
            sequence=1,
            status=StockReceipt.Status.RECEIVED,
            received_at=timezone.now(),
            recorded_by=self.owner,
        )
        stock_line = StockBatch.objects.create(
            receipt=receipt,
            product=product,
            tracking_mode=Product.TrackingMode.INDIVIDUAL,
            quantity_received=Decimal(str(len(units))),
            quantity_remaining=Decimal(str(len(units))),
            received_unit="piece",
            received_at=timezone.now(),
            recorded_by=self.owner,
        )
        for index, unit in enumerate(units, start=1):
            TrackedUnit.objects.create(
                stock_line=stock_line,
                product=product,
                internal_serial=f"PRIVATE-INTERNAL-{index}",
                model_name="Phone X",
                brand="Tunakuza Test",
                color=unit["color"],
                capacity="256GB",
                imei=f"SECRET-IMEI-{index}",
                serial_number=f"SECRET-SERIAL-{index}",
                condition="New",
                status=unit["status"],
            )
        return stock_line

    def test_published_site_on_active_business_is_public(self):
        response = self.client.get(self.site_url())

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["data"]["displayName"], self.site.display_name)

    def test_unpublished_site_is_not_public(self):
        self.site.is_published = False
        self.site.save(update_fields=["is_published", "updated_at"])

        response = self.client.get(self.site_url())

        self.assertEqual(response.status_code, 404)

    def test_disabled_business_site_is_not_public(self):
        self.business.status = Business.Status.DISABLED
        self.business.save(update_fields=["status", "updated_at"])

        response = self.client.get(self.site_url())

        self.assertEqual(response.status_code, 404)

    def test_unpublished_listing_and_variant_are_not_exposed(self):
        product = self.create_quantity_product()
        self.create_commerce_variant(product)
        self.create_commerce_variant(product, is_published=False)
        hidden_listing = WebsiteListing.objects.create(
            site=self.site,
            slug="hidden-product",
            title={"en": "Hidden", "sw": "Imefichwa"},
            is_published=False,
        )
        self.create_commerce_variant(product, listing=hidden_listing)

        response = self.client.get(self.products_url())

        self.assertEqual(response.status_code, 200)
        products = response.data["data"]["products"]
        self.assertEqual([product_data["slug"] for product_data in products], [self.listing.slug])
        self.assertEqual(len(products[0]["skus"]), 1)

    def test_quantity_sku_uses_commerce_availability_without_exact_count(self):
        product = self.create_quantity_product(quantity="2", threshold="3")
        self.create_commerce_variant(product)

        response = self.client.get(self.product_url())

        self.assertEqual(response.status_code, 200)
        payload = response.data["data"]
        self.assertEqual(payload["skus"][0]["availability"], "low_stock")
        serialized = str(payload).lower()
        self.assertNotIn("current_quantity", serialized)
        self.assertNotIn("available_quantity", serialized)

    def test_individual_sku_exposes_public_combinations_without_private_identifiers(self):
        product = Product.objects.create(
            business=self.business,
            name="Phone X",
            sku="TEST-PHONE-X",
            unit="piece",
            selling_price=Decimal("2500000"),
            tracking_mode=Product.TrackingMode.INDIVIDUAL,
            current_quantity=Decimal("99"),
            low_stock_threshold=Decimal("0"),
            is_active=True,
        )
        self.create_individual_stock(
            product,
            [
                {"color": "Black", "status": TrackedUnit.Status.AVAILABLE},
                {"color": "Blue", "status": TrackedUnit.Status.SOLD},
            ],
        )
        variant = self.create_commerce_variant(product)

        response = self.client.get(self.product_url())

        self.assertEqual(response.status_code, 200)
        payload = response.data["data"]
        color_option = next(option for option in payload["options"] if option["id"] == "color")
        self.assertEqual(
            {value["value"] for value in color_option["values"]},
            {"Black", "Blue"},
        )
        availability_by_color = {
            sku["options"]["color"]: sku["availability"] for sku in payload["skus"]
        }
        self.assertEqual(availability_by_color["Black"], "in_stock")
        self.assertEqual(availability_by_color["Blue"], "out_of_stock")

        serialized = str(payload).lower()
        for private_value in (
            "secret-imei",
            "secret-serial",
            "private-internal",
            "imei",
            "serial_number",
            "internal_serial",
            "current_quantity",
            "available_quantity",
        ):
            self.assertNotIn(private_value, serialized)

        TrackedUnit.objects.filter(product=product).update(status=TrackedUnit.Status.SOLD)
        self.assertEqual(variant.resolved_availability(), WebsiteVariant.Availability.OUT_OF_STOCK)

    def test_cross_workspace_commerce_product_is_rejected_and_not_leaked(self):
        other_business = Business.objects.create(
            name="Other Shop",
            public_handle="other-storefront-shop",
            country_code="TZ",
            created_by=self.owner,
        )
        other_product = Product.objects.create(
            business=other_business,
            name="Private Other Product",
            sku="OTHER-PRIVATE-SKU",
            unit="piece",
            selling_price=Decimal("999999"),
            current_quantity=Decimal("25"),
            is_active=True,
        )
        variant = WebsiteVariant(
            listing=self.listing,
            commerce_product=other_product,
            website_price=Decimal("1000"),
            price_source=WebsiteVariant.Source.WEBSITE,
            availability_source=WebsiteVariant.Source.WEBSITE,
        )

        with self.assertRaises(DjangoValidationError):
            variant.full_clean()

        variant.save()
        response = self.client.get(self.product_url())

        self.assertEqual(response.status_code, 200)
        payload = response.data["data"]
        serialized = str(payload)
        self.assertNotIn(str(other_product.id), serialized)
        self.assertNotIn(other_product.sku, serialized)
        self.assertNotIn(other_product.name, serialized)
        self.assertNotIn("commerceProductId", serialized)
