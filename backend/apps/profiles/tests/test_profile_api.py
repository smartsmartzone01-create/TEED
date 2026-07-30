import tempfile
from io import BytesIO

from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import override_settings
from django.urls import reverse
from PIL import Image
from rest_framework import status
from rest_framework.test import APITestCase

from apps.identity.models import IdentitySecurityEvent

from ..models import UserProfile
from .factories import create_profile_user


def profile_image_upload():
    buffer = BytesIO()
    Image.new("RGB", (20, 20), color="orange").save(buffer, format="PNG")
    return SimpleUploadedFile(
        "profile.png",
        buffer.getvalue(),
        content_type="image/png",
    )


class ProfileAPITests(APITestCase):
    def setUp(self):
        self.user = create_profile_user()
        self.client.force_authenticate(user=self.user)

    def test_overview_returns_completion_and_quick_links(self):
        response = self.client.get(reverse("profiles:overview"))

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["data"]["completion"]["percentage"], 100)
        self.assertEqual(
            response.data["data"]["quick_links"],
            ["personal", "edit", "contacts"],
        )
        self.assertFalse(UserProfile.objects.filter(user=self.user).exists())

    def test_personal_information_aggregates_identity_and_profile(self):
        UserProfile.objects.create(user=self.user, region="Dodoma")

        response = self.client.get(reverse("profiles:personal-information"))

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["data"]["username"], self.user.username)
        self.assertEqual(response.data["data"]["region"], "Dodoma")
        self.assertIn("created_at", response.data["data"])

    def test_profile_update_does_not_accept_contact_credentials(self):
        response = self.client.patch(
            reverse("profiles:update"),
            {
                "first_name": "Changed",
                "email": "replacement@example.com",
                "phone_number": "+255754444444",
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(
            response.data["errors"]["fields"]["email"][0]["code"],
            "managed_by_identity",
        )
        self.user.refresh_from_db()
        self.assertEqual(self.user.first_name, "Profile")
        self.assertEqual(self.user.email, "profile@example.com")
        self.assertEqual(self.user.phone_number, "+255712345678")

    def test_profile_update_records_field_names_without_values(self):
        response = self.client.patch(
            reverse("profiles:update"),
            {
                "first_name": "Changed",
                "region": "Arusha",
            },
            format="json",
            REMOTE_ADDR="192.0.2.10",
            HTTP_USER_AGENT="Profile API test",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        event = IdentitySecurityEvent.objects.get(
            user=self.user,
            event_type=IdentitySecurityEvent.EventType.PROFILE_UPDATED,
        )
        self.assertEqual(
            event.metadata,
            {"changed_fields": ["first_name", "region"]},
        )
        self.assertNotIn("Changed", str(event.metadata))
        self.assertEqual(str(event.ip_address), "192.0.2.10")

    def test_contacts_are_read_only_identity_summaries(self):
        response = self.client.get(reverse("profiles:contacts"))

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["data"]["email"]["value"], self.user.email)
        self.assertNotIn("secondary_email", response.data["data"])
        self.assertNotIn("secondary_phone", response.data["data"])

    def test_onboarding_is_required(self):
        self.user.onboarding_completed_at = None
        self.user.save(update_fields=["onboarding_completed_at", "updated_at"])

        response = self.client.get(reverse("profiles:overview"))

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.assertEqual(response.data["errors"]["code"], "onboarding_required")

    def test_authentication_is_required(self):
        self.client.force_authenticate(user=None)

        response = self.client.get(reverse("profiles:overview"))

        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_image_upload_and_removal(self):
        with tempfile.TemporaryDirectory() as media_root:
            with override_settings(MEDIA_ROOT=media_root):
                upload = self.client.patch(
                    reverse("profiles:update"),
                    {"profile_image": profile_image_upload()},
                    format="multipart",
                )

                self.assertEqual(upload.status_code, status.HTTP_200_OK)
                self.assertIsNotNone(upload.data["data"]["profile_image_url"])

                removal = self.client.delete(reverse("profiles:image"))

                self.assertEqual(removal.status_code, status.HTTP_200_OK)
                self.user.profile.refresh_from_db()
                self.assertFalse(self.user.profile.profile_image)
