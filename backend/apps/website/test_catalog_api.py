from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from apps.identity.services import issue_token_pair
from apps.workspaces.models import BusinessMembership
from apps.workspaces.policy import WorkspaceRole
from apps.workspaces.services import create_business
from apps.workspaces.tests.factories import create_user

from .models import WebsiteListing, WebsiteMedia, WebsiteSite, WebsiteVariant


class WebsiteStandaloneCatalogAPITests(APITestCase):
    def authenticate(self, user):
        tokens = issue_token_pair(user=user)
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {tokens['access']}")

    def setUp(self):
        self.owner = create_user("website-catalog-owner@example.com")
        self.member = create_user("website-catalog-member@example.com")
        self.business = create_business(user=self.owner, name="Website Catalog Business")
        BusinessMembership.objects.create(
            business=self.business,
            user=self.member,
            role=WorkspaceRole.MEMBER,
        )
        self.site = WebsiteSite.objects.create(
            business=self.business,
            slug="catalog",
            display_name="Catalog",
        )
        self.authenticate(self.owner)

    def listing_list_url(self):
        return reverse(
            "website:listing-list",
            kwargs={"business_id": self.business.id, "site_id": self.site.id},
        )

    def variant_list_url(self, listing_id):
        return reverse(
            "website:variant-list",
            kwargs={
                "business_id": self.business.id,
                "site_id": self.site.id,
                "listing_id": listing_id,
            },
        )

    def test_owner_can_create_standalone_listing_and_variant(self):
        listing_response = self.client.post(
            self.listing_list_url(),
            {
                "slug": "website-only-phone",
                "title": {"en": "Website only phone", "sw": "Simu ya tovuti"},
                "brand": "Tunakuza Demo",
                "is_published": True,
            },
            format="json",
        )
        self.assertEqual(listing_response.status_code, status.HTTP_201_CREATED)
        listing_id = listing_response.data["data"]["id"]

        variant_response = self.client.post(
            self.variant_list_url(listing_id),
            {
                "sku": "WEB-ONLY-256",
                "options": {"color": "Black", "storage": "256 GB"},
                "website_price": "1250000.00",
                "currency": "tzs",
                "website_availability": "in_stock",
            },
            format="json",
        )
        self.assertEqual(variant_response.status_code, status.HTTP_201_CREATED)
        payload = variant_response.data["data"]
        self.assertIsNone(payload["commerce_product_id"])
        self.assertEqual(payload["price_source"], WebsiteVariant.Source.WEBSITE)
        self.assertEqual(payload["availability_source"], WebsiteVariant.Source.WEBSITE)
        self.assertEqual(payload["currency"], "TZS")

    def test_member_can_read_catalog_but_cannot_mutate_it(self):
        WebsiteListing.objects.create(
            site=self.site,
            slug="visible",
            title={"en": "Visible"},
        )
        self.authenticate(self.member)

        listed = self.client.get(self.listing_list_url())
        self.assertEqual(listed.status_code, status.HTTP_200_OK)
        self.assertEqual(len(listed.data["data"]["listings"]), 1)

        denied = self.client.post(
            self.listing_list_url(),
            {"slug": "denied", "title": {"en": "Denied"}},
            format="json",
        )
        self.assertEqual(denied.status_code, status.HTTP_403_FORBIDDEN)

    def test_listing_primary_media_must_belong_to_same_site(self):
        other_site = WebsiteSite.objects.create(
            business=self.business,
            slug="other",
            display_name="Other",
        )
        other_media = WebsiteMedia.objects.create(
            site=other_site,
            public_url="https://example.com/other.jpg",
        )
        response = self.client.post(
            self.listing_list_url(),
            {
                "slug": "wrong-media",
                "title": {"en": "Wrong media"},
                "primary_media_id": str(other_media.id),
            },
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_duplicate_listing_slug_is_rejected(self):
        WebsiteListing.objects.create(
            site=self.site,
            slug="duplicate",
            title={"en": "Existing"},
        )
        response = self.client.post(
            self.listing_list_url(),
            {"slug": "duplicate", "title": {"en": "Duplicate"}},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_deleting_listing_hides_listing_and_its_variants(self):
        listing = WebsiteListing.objects.create(
            site=self.site,
            slug="delete-me",
            title={"en": "Delete me"},
        )
        variant = WebsiteVariant.objects.create(
            listing=listing,
            sku="DELETE-ME",
            website_price="1000.00",
        )
        response = self.client.delete(
            reverse(
                "website:listing-detail",
                kwargs={
                    "business_id": self.business.id,
                    "site_id": self.site.id,
                    "listing_id": listing.id,
                },
            )
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertFalse(WebsiteListing.objects.filter(id=listing.id).exists())
        self.assertFalse(WebsiteVariant.objects.filter(id=variant.id).exists())
