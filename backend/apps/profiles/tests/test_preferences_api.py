from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from apps.dashboard.preferences.models import UserPreference

from .factories import create_profile_user


class UserPreferenceAPITests(APITestCase):
    def setUp(self):
        self.user = create_profile_user()
        self.client.force_authenticate(user=self.user)

    def test_get_lazily_creates_default_preferences(self):
        self.assertFalse(UserPreference.objects.filter(user=self.user).exists())

        response = self.client.get(reverse("profiles:preferences"))

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["data"]["language"], "en")
        self.assertEqual(response.data["data"]["appearance"], "system")
        self.assertEqual(response.data["data"]["timezone"], "UTC")
        self.assertEqual(response.data["data"]["date_format"], "DD/MM/YYYY")
        self.assertEqual(response.data["data"]["time_format"], "24h")
        self.assertFalse(response.data["data"]["reduced_motion"])
        self.assertTrue(UserPreference.objects.filter(user=self.user).exists())

    def test_patch_updates_only_supplied_preferences(self):
        response = self.client.patch(
            reverse("profiles:preferences"),
            {
                "language": "sw",
                "appearance": "dark",
                "timezone": "Africa/Dar_es_Salaam",
                "reduced_motion": True,
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        preferences = UserPreference.objects.get(user=self.user)
        self.assertEqual(preferences.language, "sw")
        self.assertEqual(preferences.appearance, "dark")
        self.assertEqual(preferences.timezone, "Africa/Dar_es_Salaam")
        self.assertEqual(preferences.date_format, "DD/MM/YYYY")
        self.assertTrue(preferences.reduced_motion)

    def test_patch_rejects_invalid_timezone(self):
        response = self.client.patch(
            reverse("profiles:preferences"),
            {"timezone": "Not/A_Timezone"},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(
            response.data["errors"]["fields"]["timezone"][0]["code"],
            "timezone_invalid",
        )

    def test_patch_rejects_empty_payload(self):
        response = self.client.patch(
            reverse("profiles:preferences"),
            {},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(
            response.data["errors"]["non_field_errors"][0]["code"],
            "preferences_update_empty",
        )

    def test_onboarding_is_required(self):
        self.user.onboarding_completed_at = None
        self.user.save(update_fields=["onboarding_completed_at", "updated_at"])

        response = self.client.get(reverse("profiles:preferences"))

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.assertEqual(response.data["errors"]["code"], "onboarding_required")

    def test_authentication_is_required(self):
        self.client.force_authenticate(user=None)

        response = self.client.get(reverse("profiles:preferences"))

        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
