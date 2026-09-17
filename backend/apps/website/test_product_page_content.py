from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from apps.identity.services import issue_token_pair
from apps.workspaces.services import create_business
from apps.workspaces.tests.factories import create_user

from .models import WebsiteListing, WebsiteListingStoryBlock, WebsiteMedia, WebsiteSite


class WebsiteProductPageContentAPITests(APITestCase):
    def setUp(self):
        self.owner = create_user("website-product-page-content@example.com")
        self.business = create_business(user=self.owner, name="Website Product Page Content")
        self.site = WebsiteSite.objects.create(
            business=self.business,
            slug="product-page-content",
            display_name="Product page content",
        )
        self.listing = WebsiteListing.objects.create(
            site=self.site,
            slug="story-phone",
            title={"en": "Story phone", "sw": "Simu ya maelezo"},
        )
        tokens = issue_token_pair(user=self.owner)
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {tokens['access']}")

    def listing_detail_url(self):
        return reverse(
            "website:listing-detail",
            kwargs={
                "business_id": self.business.id,
                "site_id": self.site.id,
                "listing_id": self.listing.id,
            },
        )

    def test_owner_can_save_and_clear_discover_and_story_content(self):
        discover_media = WebsiteMedia.objects.create(
            site=self.site,
            public_url="https://cdn.example.com/discover.webp",
            original_name="discover.webp",
        )
        story_media = WebsiteMedia.objects.create(
            site=self.site,
            public_url="https://cdn.example.com/story.webp",
            original_name="story.webp",
        )

        response = self.client.patch(
            self.listing_detail_url(),
            {
                "description": {
                    "en": "A richer product introduction.",
                    "sw": "Utangulizi mpana wa bidhaa.",
                },
                "discover_media_id": str(discover_media.id),
                "story_blocks": [
                    {
                        "heading": {"en": "Built to last", "sw": "Imetengenezwa kudumu"},
                        "body": {"en": "Durable materials.", "sw": "Vifaa imara."},
                        "media_id": str(story_media.id),
                    },
                    {
                        "heading": {"en": "Simple setup", "sw": "Usanidi rahisi"},
                        "body": {"en": "Ready in minutes.", "sw": "Tayari kwa dakika chache."},
                    },
                ],
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        payload = response.data["data"]
        self.assertEqual(payload["discover_media_id"], str(discover_media.id))
        self.assertEqual(len(payload["story_blocks"]), 2)
        self.assertEqual(payload["story_blocks"][0]["media_id"], str(story_media.id))
        self.assertIsNone(payload["story_blocks"][1]["media_id"])

        self.listing.refresh_from_db()
        self.assertEqual(self.listing.discover_media_id, discover_media.id)
        blocks = list(WebsiteListingStoryBlock.objects.filter(listing=self.listing))
        self.assertEqual([block.sort_order for block in blocks], [0, 1])
        self.assertEqual(blocks[0].media_id, story_media.id)
        self.assertIsNone(blocks[1].media_id)

        clear_response = self.client.patch(
            self.listing_detail_url(),
            {"story_blocks": []},
            format="json",
        )
        self.assertEqual(clear_response.status_code, status.HTTP_200_OK)
        self.assertEqual(clear_response.data["data"]["story_blocks"], [])
        self.assertFalse(WebsiteListingStoryBlock.objects.filter(listing=self.listing).exists())

    def test_story_media_must_belong_to_same_site(self):
        other_site = WebsiteSite.objects.create(
            business=self.business,
            slug="other-product-page-content",
            display_name="Other product page content",
        )
        other_media = WebsiteMedia.objects.create(
            site=other_site,
            public_url="https://cdn.example.com/other-story.webp",
            original_name="other-story.webp",
        )

        response = self.client.patch(
            self.listing_detail_url(),
            {
                "story_blocks": [
                    {
                        "heading": {"en": "Wrong image"},
                        "media_id": str(other_media.id),
                    }
                ]
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertFalse(WebsiteListingStoryBlock.objects.filter(listing=self.listing).exists())
