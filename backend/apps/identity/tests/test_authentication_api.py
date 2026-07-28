from common.exceptions.modules.identity import (
    EmailVerificationRequired,
    InvalidCredentials,
)
from django.conf import settings
from django.contrib.auth import get_user_model
from django.core.cache import cache
from django.urls import reverse
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APIClient, APITestCase
from rest_framework_simplejwt.token_blacklist.models import (
    OutstandingToken,
)

User = get_user_model()


class EmailLoginAPITests(APITestCase):
    password = "StrongTestPassword123!"

    def setUp(self):
        cache.clear()
        self.url = reverse("identity:email-login")
        self.user = User.objects.create_user(
            email="login@example.com",
            password=self.password,
            is_email_verified=True,
        )

    def test_login_incomplete_user_returns_session_contract(self):
        response = self.client.post(
            self.url,
            {
                "email": "LOGIN@EXAMPLE.COM",
                "password": self.password,
            },
            format="json",
            HTTP_AUTHORIZATION="Bearer invalid-token",
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_200_OK,
        )
        self.assertTrue(response.data["success"])
        self.assertEqual(
            response.data["message"],
            "Signed in successfully.",
        )
        self.assertEqual(
            response.data["data"]["user_id"],
            str(self.user.id),
        )
        self.assertEqual(
            response.data["data"]["email"],
            self.user.email,
        )
        self.assertEqual(
            response.data["data"]["next_step"],
            "complete_onboarding",
        )
        self.assertFalse(
            response.data["data"]["is_onboarding_complete"],
        )
        self.assertIn(
            "access",
            response.data["data"]["tokens"],
        )
        self.assertNotIn(
            "refresh",
            response.data["data"]["tokens"],
        )
        self.assertIn(
            settings.REFRESH_TOKEN_COOKIE_NAME,
            response.cookies,
        )
        refresh_cookie = response.cookies[settings.REFRESH_TOKEN_COOKIE_NAME]
        self.assertTrue(refresh_cookie["httponly"])
        self.assertEqual(
            refresh_cookie["samesite"],
            "Lax",
        )
        self.assertNotIn(
            "password",
            response.data["data"],
        )

    def test_login_completed_user_returns_dashboard_next_step(self):
        self.user.username = "teedmember"
        self.user.phone_number = "+255712345678"
        self.user.country_code = "TZ"
        self.user.onboarding_completed_at = timezone.now()
        self.user.save(
            update_fields=[
                "username",
                "phone_number",
                "country_code",
                "onboarding_completed_at",
                "updated_at",
            ]
        )

        response = self.client.post(
            self.url,
            {
                "email": self.user.email,
                "password": self.password,
            },
            format="json",
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_200_OK,
        )
        self.assertEqual(
            response.data["data"]["next_step"],
            "dashboard",
        )
        self.assertTrue(
            response.data["data"]["is_onboarding_complete"],
        )

    def test_invalid_and_unknown_credentials_share_generic_error(self):
        requests = [
            {
                "email": self.user.email,
                "password": "WrongPassword123!",
            },
            {
                "email": "unknown@example.com",
                "password": self.password,
            },
        ]

        observed_errors = []

        for payload in requests:
            with self.subTest(email=payload["email"]):
                response = self.client.post(
                    self.url,
                    payload,
                    format="json",
                )

                self.assertEqual(
                    response.status_code,
                    status.HTTP_401_UNAUTHORIZED,
                )
                self.assertFalse(response.data["success"])
                self.assertEqual(
                    response.data["errors"]["code"],
                    InvalidCredentials.default_code,
                )
                observed_errors.append(
                    {
                        "message": response.data["message"],
                        "errors": response.data["errors"],
                    }
                )

        self.assertEqual(
            observed_errors[0],
            observed_errors[1],
        )

        self.assertFalse(
            OutstandingToken.objects.filter(
                user=self.user,
            ).exists()
        )

    def test_unverified_user_is_rejected_without_tokens(self):
        self.user.is_email_verified = False
        self.user.save(
            update_fields=[
                "is_email_verified",
                "updated_at",
            ]
        )

        response = self.client.post(
            self.url,
            {
                "email": self.user.email,
                "password": self.password,
            },
            format="json",
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_403_FORBIDDEN,
        )
        self.assertFalse(response.data["success"])
        self.assertEqual(
            response.data["errors"]["code"],
            EmailVerificationRequired.default_code,
        )
        self.assertFalse(
            OutstandingToken.objects.filter(
                user=self.user,
            ).exists()
        )

    def test_invalid_request_data_is_rejected(self):
        response = self.client.post(
            self.url,
            {
                "email": "not-an-email",
            },
            format="json",
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_400_BAD_REQUEST,
        )
        self.assertFalse(response.data["success"])
        self.assertIn(
            "email",
            response.data["errors"],
        )
        self.assertIn(
            "password",
            response.data["errors"],
        )

    def test_login_requires_csrf_before_issuing_browser_session(self):
        csrf_client = APIClient(enforce_csrf_checks=True)

        response = csrf_client.post(
            self.url,
            {
                "email": self.user.email,
                "password": self.password,
            },
            format="json",
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_403_FORBIDDEN,
        )
        self.assertEqual(
            response.json()["errors"]["code"],
            "csrf_failed",
        )
        self.assertFalse(
            OutstandingToken.objects.filter(
                user=self.user,
            ).exists()
        )
