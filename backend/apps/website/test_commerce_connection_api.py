from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from apps.commerce.catalog.models import Product, ProductFamily
from apps.identity.services import issue_token_pair
from apps.workspaces.models import BusinessMembership
from apps.workspaces.policy import WorkspaceRole
from apps.workspaces.services import create_business
from apps.workspaces.tests.factories import create_user

from .models import WebsiteListing, WebsiteSite, WebsiteVariant


class WebsiteCommerceConnectionAPITests(APITestCase):
    def authenticate(self, user):
        tokens = issue_token_pair(user=user)
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {tokens['access']}")

    def setUp(self):
        self.owner = create_user("website-commerce-owner@example.com")
        self.member = create_user("website-commerce-member@example.com")
        self.business = create_business(user=self.owner, name="Website Commerce Business")
        BusinessMembership.objects.create(
            business=self.business,
            user=self.member,
            role=WorkspaceRole.MEMBER,
        )
        self.site = WebsiteSite.objects.create(
            business=self.business,
            slug="commerce-site",
            display_name="Commerce site",
        )
        self.family = ProductFamily.objects.create(
            business=self.business,
            name="Phone X",
            brand="Example",
        )
        self.product_128 = Product.objects.create(
            business=self.business,
            family=self.family,
            name="Phone X 128",
            sku="PHONE-X-128",
            brand="Example",
            variant="128 GB",
            variant_options=[
                {"key": "storage", "label": "Storage", "value": "128 GB"},
                {"key": "color", "label": "Color", "value": "Black"},
            ],
            current_quantity="5",
            selling_price="999999.00",
        )
        self.product_256 = Product.objects.create(
            business=self.business,
            family=self.family,
            name="Phone X 256",
            sku="PHONE-X-256",
            brand="Example",
            variant="256 GB",
            variant_options=[
                {"key": "storage", "label": "Storage", "value": "256 GB"},
                {"key": "color", "label": "Color", "value": "Black"},
            ],
            current_quantity="2",
            selling_price="1299999.00",
        )
        self.authenticate(self.owner)

    def catalog_url(self):
        return reverse(
            "website:commerce-catalog",
            kwargs={"business_id": self.business.id, "site_id": self.site.id},
        )

    def import_url(self):
        return reverse(
            "website:commerce-import",
            kwargs={"business_id": self.business.id, "site_id": self.site.id},
        )

    def test_catalog_discovery_exposes_identity_without_commerce_price(self):
        response = self.client.get(self.catalog_url())
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        products = response.data["data"]["products"]
        self.assertEqual(len(products), 2)
        self.assertNotIn("selling_price", products[0])
        self.assertFalse(products[0]["linked"])

    def test_importing_one_family_sku_imports_active_family_and_preserves_website_ownership(self):
        response = self.client.post(
            self.import_url(),
            {"product_ids": [str(self.product_128.id)]},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["data"]["created_listings"], 1)
        self.assertEqual(response.data["data"]["created_variants"], 2)

        listing = WebsiteListing.objects.get(site=self.site)
        self.assertFalse(listing.is_published)
        variants = list(WebsiteVariant.objects.filter(listing=listing).order_by("sku"))
        self.assertEqual(len(variants), 2)
        self.assertTrue(all(variant.website_price is None for variant in variants))
        self.assertTrue(
            all(variant.price_source == WebsiteVariant.Source.WEBSITE for variant in variants)
        )
        self.assertTrue(
            all(
                variant.availability_source == WebsiteVariant.Source.COMMERCE
                for variant in variants
            )
        )
        self.assertTrue(all(not variant.is_published for variant in variants))

    def test_import_is_idempotent_for_already_connected_products(self):
        payload = {"product_ids": [str(self.product_128.id)]}
        first = self.client.post(self.import_url(), payload, format="json")
        self.assertEqual(first.status_code, status.HTTP_200_OK)
        second = self.client.post(self.import_url(), payload, format="json")
        self.assertEqual(second.status_code, status.HTTP_200_OK)
        self.assertEqual(second.data["data"]["created_variants"], 0)
        self.assertEqual(second.data["data"]["existing_variants"], 2)
        self.assertEqual(WebsiteVariant.objects.filter(listing__site=self.site).count(), 2)

    def test_member_can_discover_but_cannot_import(self):
        self.authenticate(self.member)
        discovered = self.client.get(self.catalog_url())
        self.assertEqual(discovered.status_code, status.HTTP_200_OK)
        denied = self.client.post(
            self.import_url(),
            {"product_ids": [str(self.product_128.id)]},
            format="json",
        )
        self.assertEqual(denied.status_code, status.HTTP_403_FORBIDDEN)

    def test_disconnect_keeps_website_variant_and_freezes_current_availability(self):
        imported = self.client.post(
            self.import_url(),
            {"product_ids": [str(self.product_128.id)]},
            format="json",
        )
        self.assertEqual(imported.status_code, status.HTTP_200_OK)
        variant = WebsiteVariant.objects.get(commerce_product=self.product_128)
        variant.website_price = "1100000.00"
        variant.save(update_fields=["website_price", "updated_at"])

        response = self.client.post(
            reverse(
                "website:commerce-disconnect",
                kwargs={
                    "business_id": self.business.id,
                    "site_id": self.site.id,
                    "listing_id": variant.listing_id,
                    "variant_id": variant.id,
                },
            ),
            {},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        variant.refresh_from_db()
        self.assertIsNone(variant.commerce_product_id)
        self.assertEqual(variant.availability_source, WebsiteVariant.Source.WEBSITE)
        self.assertEqual(variant.website_availability, WebsiteVariant.Availability.IN_STOCK)
        self.assertEqual(str(variant.website_price), "1100000.00")
        self.assertTrue(WebsiteVariant.objects.filter(id=variant.id).exists())

    def test_import_rejects_product_from_another_workspace(self):
        outsider = create_user("website-commerce-outsider@example.com")
        other_business = create_business(user=outsider, name="Other Business")
        foreign_product = Product.objects.create(
            business=other_business,
            name="Foreign product",
            sku="FOREIGN-SKU",
        )
        response = self.client.post(
            self.import_url(),
            {"product_ids": [str(foreign_product.id)]},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
