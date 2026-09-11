import json
from io import BytesIO
from tempfile import TemporaryDirectory

from django.core.files.storage import default_storage
from django.core.files.uploadedfile import SimpleUploadedFile
from django.urls import reverse
from PIL import Image
from rest_framework import status
from rest_framework.test import APITestCase

from apps.identity.services import issue_token_pair
from apps.workspaces.models import BusinessMembership
from apps.workspaces.policy import WorkspaceRole
from apps.workspaces.services import create_business
from apps.workspaces.tests.factories import create_user

from .models import WebsiteMedia, WebsiteSite


class WebsiteMediaUploadAPITests(APITestCase):
    def authenticate(self, user):
        tokens = issue_token_pair(user=user)
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {tokens['access']}")

    def setUp(self):
        self.owner = create_user("website-upload-owner@example.com")
        self.member = create_user("website-upload-member@example.com")
        self.business = create_business(user=self.owner, name="Website Upload Business")
        BusinessMembership.objects.create(
            business=self.business,
            user=self.member,
            role=WorkspaceRole.MEMBER,
        )
        self.site = WebsiteSite.objects.create(
            business=self.business,
            slug="upload-store",
            display_name="Upload Store",
        )
        self.authenticate(self.owner)

    def upload_url(self):
        return reverse(
            "website:media-upload",
            kwargs={"business_id": self.business.id, "site_id": self.site.id},
        )

    def detail_url(self, media):
        return reverse(
            "website:media-detail",
            kwargs={
                "business_id": self.business.id,
                "site_id": self.site.id,
                "media_id": media.id,
            },
        )

    def image_upload(self, name="product.png"):
        content = BytesIO()
        Image.new("RGB", (24, 18), "navy").save(content, format="PNG")
        return SimpleUploadedFile(
            name,
            content.getvalue(),
            content_type="image/png",
        )

    def test_owner_can_upload_image_into_site_scoped_storage(self):
        with TemporaryDirectory() as media_root, self.settings(MEDIA_ROOT=media_root):
            response = self.client.post(
                self.upload_url(),
                {
                    "file": self.image_upload(),
                    "alt_text": json.dumps({"en": "Phone", "sw": "Simu"}),
                },
                format="multipart",
            )

            self.assertEqual(response.status_code, status.HTTP_201_CREATED)
            payload = response.data["data"]
            self.assertEqual(payload["mime_type"], "image/png")
            self.assertEqual(payload["width"], 24)
            self.assertEqual(payload["height"], 18)
            self.assertEqual(payload["alt_text"], {"en": "Phone", "sw": "Simu"})
            self.assertTrue(
                payload["storage_key"].startswith(f"websites/{self.site.id}/media/")
            )
            self.assertTrue(default_storage.exists(payload["storage_key"]))

    def test_upload_rejects_non_image_file(self):
        invalid = SimpleUploadedFile(
            "notes.txt",
            b"not an image",
            content_type="text/plain",
        )
        response = self.client.post(
            self.upload_url(),
            {"file": invalid},
            format="multipart",
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertFalse(WebsiteMedia.objects.filter(site=self.site).exists())

    def test_member_cannot_upload_media(self):
        self.authenticate(self.member)
        response = self.client.post(
            self.upload_url(),
            {"file": self.image_upload()},
            format="multipart",
        )

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.assertFalse(WebsiteMedia.objects.filter(site=self.site).exists())

    def test_delete_uploaded_media_removes_managed_file(self):
        with TemporaryDirectory() as media_root, self.settings(MEDIA_ROOT=media_root):
            uploaded = self.client.post(
                self.upload_url(),
                {"file": self.image_upload()},
                format="multipart",
            )
            media = WebsiteMedia.objects.get(id=uploaded.data["data"]["id"])
            storage_key = media.storage_key
            self.assertTrue(default_storage.exists(storage_key))

            with self.captureOnCommitCallbacks(execute=True):
                deleted = self.client.delete(self.detail_url(media))

            self.assertEqual(deleted.status_code, status.HTTP_200_OK)
            self.assertFalse(default_storage.exists(storage_key))
