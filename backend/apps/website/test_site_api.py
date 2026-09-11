from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from apps.identity.services import issue_token_pair
from apps.workspaces.models import BusinessMembership
from apps.workspaces.policy import WorkspaceRole
from apps.workspaces.services import create_business
from apps.workspaces.tests.factories import create_user

from .models import WebsiteSite


class WebsiteSiteAPITests(APITestCase):
    def authenticate(self, user):
        tokens = issue_token_pair(user=user)
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {tokens['access']}")

    def setUp(self):
        self.owner = create_user("website-site-owner@example.com")
        self.member = create_user("website-site-member@example.com")
        self.business = create_business(user=self.owner, name="Website Site Business")
        BusinessMembership.objects.create(
            business=self.business,
            user=self.member,
            role=WorkspaceRole.MEMBER,
        )
        self.authenticate(self.owner)

    def site_list_url(self):
        return reverse(
            "website:site-list",
            kwargs={"business_id": self.business.id},
        )

    def test_owner_can_create_list_and_update_site(self):
        created = self.client.post(
            self.site_list_url(),
            {
                "display_name": "Main Store",
                "slug": "main-store",
                "supported_locales": ["en", "sw"],
                "default_locale": "en",
            },
            format="json",
        )
        self.assertEqual(created.status_code, status.HTTP_201_CREATED)
        site_id = created.data["data"]["id"]

        listed = self.client.get(self.site_list_url())
        self.assertEqual(listed.status_code, status.HTTP_200_OK)
        self.assertEqual(len(listed.data["data"]["sites"]), 1)

        updated = self.client.patch(
            reverse(
                "website:site-detail",
                kwargs={"business_id": self.business.id, "site_id": site_id},
            ),
            {"display_name": "Updated Store", "is_published": True},
            format="json",
        )
        self.assertEqual(updated.status_code, status.HTTP_200_OK)
        self.assertEqual(updated.data["data"]["display_name"], "Updated Store")
        self.assertTrue(updated.data["data"]["is_published"])

    def test_create_uses_business_name_when_name_and_slug_are_omitted(self):
        response = self.client.post(self.site_list_url(), {}, format="json")
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data["data"]["display_name"], self.business.name)
        self.assertEqual(response.data["data"]["slug"], "website-site-business")

    def test_member_can_read_sites_but_cannot_create_or_update(self):
        site = WebsiteSite.objects.create(
            business=self.business,
            slug="member-visible",
            display_name="Member Visible",
        )
        self.authenticate(self.member)

        listed = self.client.get(self.site_list_url())
        self.assertEqual(listed.status_code, status.HTTP_200_OK)

        denied_create = self.client.post(
            self.site_list_url(),
            {"display_name": "Denied", "slug": "denied"},
            format="json",
        )
        self.assertEqual(denied_create.status_code, status.HTTP_403_FORBIDDEN)

        denied_update = self.client.patch(
            reverse(
                "website:site-detail",
                kwargs={"business_id": self.business.id, "site_id": site.id},
            ),
            {"display_name": "Denied Update"},
            format="json",
        )
        self.assertEqual(denied_update.status_code, status.HTTP_403_FORBIDDEN)

    def test_duplicate_slug_is_rejected(self):
        WebsiteSite.objects.create(
            business=self.business,
            slug="duplicate",
            display_name="Existing",
        )
        response = self.client.post(
            self.site_list_url(),
            {"display_name": "Duplicate", "slug": "duplicate"},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_site_from_another_business_is_not_visible(self):
        other_owner = create_user("website-site-other@example.com")
        other_business = create_business(user=other_owner, name="Other Business")
        other_site = WebsiteSite.objects.create(
            business=other_business,
            slug="other",
            display_name="Other",
        )
        response = self.client.get(
            reverse(
                "website:site-detail",
                kwargs={"business_id": self.business.id, "site_id": other_site.id},
            )
        )
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
