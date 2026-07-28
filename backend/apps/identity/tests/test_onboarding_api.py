from common.exceptions.modules.identity import (
    IdentityVerificationRequired,
    UsernameAlreadyTaken,
)
from django.contrib.auth import get_user_model
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from ..services import issue_token_pair

User = get_user_model()


class OnboardingAPITests(APITestCase):
    def setUp(self):
        self.url = reverse("identity:onboarding")
        self.user = User.objects.create_user(
            email="onboarding@example.com",
            password="StrongTestPassword123!",
            is_email_verified=True,
        )
        self.tokens = issue_token_pair(
            user=self.user,
        )

    def authenticate(self):
        self.client.credentials(HTTP_AUTHORIZATION=(f"Bearer {self.tokens['access']}"))

    def test_complete_onboarding(self):
        self.authenticate()

        response = self.client.post(
            self.url,
            {
                "username": "TeedMember",
                "country_code": "TZ",
                "phone_number": "0712345678",
            },
            format="json",
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_200_OK,
        )
        self.assertTrue(response.data["success"])
        self.assertEqual(
            response.data["data"]["username"],
            "teedmember",
        )
        self.assertEqual(
            response.data["data"]["phone_number"],
            "+255712345678",
        )
        self.assertEqual(
            response.data["data"]["country_code"],
            "TZ",
        )
        self.assertEqual(
            response.data["data"]["next_step"],
            "dashboard",
        )

        self.user.refresh_from_db()

        self.assertTrue(self.user.is_onboarding_complete)

    def test_authentication_is_required(self):
        response = self.client.post(
            self.url,
            {
                "username": "teedmember",
                "country_code": "TZ",
                "phone_number": "0712345678",
            },
            format="json",
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_401_UNAUTHORIZED,
        )
        self.assertFalse(response.data["success"])

    def test_verified_identity_is_required(self):
        self.user.is_email_verified = False
        self.user.save(
            update_fields=[
                "is_email_verified",
                "updated_at",
            ]
        )
        self.authenticate()

        response = self.client.post(
            self.url,
            {
                "username": "teedmember",
                "country_code": "TZ",
                "phone_number": "0712345678",
            },
            format="json",
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_403_FORBIDDEN,
        )
        self.assertEqual(
            response.data["errors"]["code"],
            IdentityVerificationRequired.default_code,
        )

    def test_duplicate_username_is_rejected(self):
        User.objects.create_user(
            email="existing@example.com",
            username="teedmember",
            password="StrongTestPassword123!",
        )
        self.authenticate()

        response = self.client.post(
            self.url,
            {
                "username": "TEEDMEMBER",
                "country_code": "KE",
                "phone_number": "0712345678",
            },
            format="json",
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_409_CONFLICT,
        )
        self.assertEqual(
            response.data["errors"]["code"],
            UsernameAlreadyTaken.default_code,
        )

    def test_invalid_country_phone_pair(self):
        self.authenticate()

        response = self.client.post(
            self.url,
            {
                "username": "teedmember",
                "country_code": "TZ",
                "phone_number": "+254712345678",
            },
            format="json",
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_400_BAD_REQUEST,
        )
        self.assertIn(
            "phone_number",
            response.data["errors"],
        )
