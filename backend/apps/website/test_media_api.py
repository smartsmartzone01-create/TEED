from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from apps.identity.services import issue_token_pair
from apps.workspaces.models import BusinessMembership
from apps.workspaces.policy import WorkspaceRole
from apps.workspaces.services import create_business
from apps.workspaces.tests.factories import create_user

from .models import WebsiteListing, WebsiteMedia, WebsiteSite


class WebsiteMediaAPITests(APITestCase):
    def authenticate(self, user):
        tokens = issue_token_pair(user=user)
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {tokens['access']}")

    def setUp(self):
        self.owner = create_user("website-media-owner@example.com")
        self.member = create_user("website-media-member@example.com")
        self.business = create_business(user=self.owner, name="Website Media Business")
        BusinessMembership.objects.create(
            business=self.business,
            user=self.member,
            role=WorkspaceRole.MEMBER,
        )
        self.site = WebsiteSite.objects.create(
            business=self.business,
            slug="store",
            display_name="Store",
        )
        self.authenticate(self.owner)

    def media_list_url(self):
        return reverse(
            "website:media-list",
            kwargs={"business_id": self.business.id, "site_id": self.site.id},
        )

    def test_owner_can_register_and_list_media(self):
        created = self.client.post(
            self.media_list_url(),
            {
                "public_url": "https://cdn.example.com/product.webp",
                "original_name": "product.webp",
                "mime_type": "image/webp",
                "alt_text": {"en": "Product", "sw": "Bidhaa"},
            },
            format="json",
        )
        self.assertEqual(created.status_code, status.HTTP_201_CREATED)
        listed = self.client.get(self.media_list_url())
        self.assertEqual(listed.status_code, status.HTTP_200_OK)
        self.assertEqual(len(listed.data["data"]["media"]), 1)

    def test_member_can_read_but_cannot_register_media(self):
        WebsiteMedia.objects.create(
            site=self.site,
            public_url="https://cdn.example.com/readable.webp",
        )
        self.authenticate(self.member)
        self.assertEqual(self.client.get(self.media_list_url()).status_code, status.HTTP_200_OK)
        denied = self.client.post(
            self.media_list_url(),
            {"public_url": "https://cdn.example.com/denied.webp"},
            format="json",
        )
        self.assertEqual(denied.status_code, status.HTTP_403_FORBIDDEN)

    def test_delete_media_detaches_listing_reference(self):
        media = WebsiteMedia.objects.create(
            site=self.site,
            public_url="https://cdn.example.com/primary.webp",
        )
        listing = WebsiteListing.objects.create(
            site=self.site,
            slug="phone",
            title={"en": "Phone", "sw": "Simu"},
            primary_media=media,
        )
        response = self.client.delete(
            reverse(
                "website:media-detail",
                kwargs={
                    "business_id": self.business.id,
                    "site_id": self.site.id,
                    "media_id": media.id,
                },
            )
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        listing.refresh_from_db()
        self.assertIsNone(listing.primary_media_id)
        self.assertFalse(WebsiteMedia.objects.filter(id=media.id).exists())

    def test_reorder_requires_every_active_media_id(self):
        first = WebsiteMedia.objects.create(
            site=self.site,
            public_url="https://cdn.example.com/first.webp",
        )
        WebsiteMedia.objects.create(
            site=self.site,
            public_url="https://cdn.example.com/second.webp",
        )
        response = self.client.post(
            reverse(
                "website:media-reorder",
                kwargs={"business_id": self.business.id, "site_id": self.site.id},
            ),
            {"media_ids": [str(first.id)]},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
