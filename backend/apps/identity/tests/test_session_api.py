from django.conf import settings
from django.contrib.auth import get_user_model
from django.test import override_settings
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APIClient, APITestCase

from ..models import UserSession
from ..services import issue_token_pair

User = get_user_model()


class SessionAPITests(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            email="session-api@example.com",
            password="StrongTestPassword123!",
            is_email_verified=True,
        )
        self.tokens = issue_token_pair(user=self.user)
        self.csrf_url = reverse("identity:session-csrf")
        self.refresh_url = reverse("identity:session-refresh")
        self.logout_url = reverse("identity:session-logout")
        self.logout_all_url = reverse("identity:session-logout-all")
        self.current_url = reverse("identity:session-current")

    def set_refresh_cookie(self, token=None):
        self.client.cookies[settings.REFRESH_TOKEN_COOKIE_NAME] = (
            token or self.tokens["refresh"]
        )

    def authenticate(self, token=None):
        self.client.credentials(
            HTTP_AUTHORIZATION=(f"Bearer {token or self.tokens['access']}")
        )

    def test_csrf_bootstrap_returns_token_and_cookie(self):
        response = self.client.get(self.csrf_url)

        self.assertEqual(
            response.status_code,
            status.HTTP_200_OK,
        )
        self.assertIn(
            "csrf_token",
            response.data["data"],
        )
        self.assertIn(
            settings.CSRF_COOKIE_NAME,
            response.cookies,
        )

    def test_refresh_rotates_cookie_and_returns_access_only(self):
        self.set_refresh_cookie()
        original_refresh = self.tokens["refresh"]

        response = self.client.post(
            self.refresh_url,
            {},
            format="json",
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_200_OK,
        )
        self.assertIn(
            "access",
            response.data["data"]["tokens"],
        )
        self.assertNotIn(
            "refresh",
            response.data["data"]["tokens"],
        )
        rotated_cookie = response.cookies[settings.REFRESH_TOKEN_COOKIE_NAME]
        self.assertNotEqual(
            rotated_cookie.value,
            original_refresh,
        )

    def test_refresh_without_cookie_is_rejected(self):
        response = self.client.post(
            self.refresh_url,
            {},
            format="json",
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_401_UNAUTHORIZED,
        )
        self.assertEqual(
            response.data["errors"]["code"],
            "refresh_token_invalid",
        )

    def test_refresh_reuse_revokes_rotated_access(self):
        original_refresh = self.tokens["refresh"]
        self.set_refresh_cookie(original_refresh)
        rotated = self.client.post(
            self.refresh_url,
            {},
            format="json",
        )
        rotated_access = rotated.data["data"]["tokens"]["access"]

        self.set_refresh_cookie(original_refresh)
        replay = self.client.post(
            self.refresh_url,
            {},
            format="json",
        )

        self.assertEqual(
            replay.status_code,
            status.HTTP_401_UNAUTHORIZED,
        )
        self.assertEqual(
            replay.data["errors"]["code"],
            "refresh_token_reuse_detected",
        )

        self.authenticate(rotated_access)
        current_response = self.client.get(self.current_url)
        self.assertEqual(
            current_response.status_code,
            status.HTTP_401_UNAUTHORIZED,
        )

    def test_current_session_returns_authenticated_user(self):
        self.authenticate()

        response = self.client.get(self.current_url)

        self.assertEqual(
            response.status_code,
            status.HTTP_200_OK,
        )
        self.assertEqual(
            response.data["data"]["user"]["email"],
            self.user.email,
        )
        self.assertEqual(
            response.data["data"]["session_id"],
            self.tokens["session_id"],
        )

    def test_logout_revokes_access_and_clears_cookie(self):
        self.set_refresh_cookie()

        response = self.client.post(
            self.logout_url,
            {},
            format="json",
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_200_OK,
        )
        self.assertEqual(
            response.cookies[settings.REFRESH_TOKEN_COOKIE_NAME]["max-age"],
            0,
        )

        self.authenticate()
        current_response = self.client.get(self.current_url)
        self.assertEqual(
            current_response.status_code,
            status.HTTP_401_UNAUTHORIZED,
        )

    def test_logout_all_revokes_all_user_sessions(self):
        second_tokens = issue_token_pair(user=self.user)
        self.authenticate(second_tokens["access"])
        self.set_refresh_cookie(second_tokens["refresh"])

        response = self.client.post(
            self.logout_all_url,
            {},
            format="json",
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_200_OK,
        )
        self.assertEqual(
            response.data["data"]["revoked_sessions"],
            2,
        )
        self.assertFalse(
            UserSession.objects.filter(
                user=self.user,
                revoked_at__isnull=True,
            ).exists()
        )

    def test_cookie_session_mutations_require_csrf(self):
        csrf_client = APIClient(
            enforce_csrf_checks=True,
        )
        csrf_client.cookies[settings.REFRESH_TOKEN_COOKIE_NAME] = self.tokens["refresh"]

        rejected = csrf_client.post(
            self.refresh_url,
            {},
            format="json",
        )

        self.assertEqual(
            rejected.status_code,
            status.HTTP_403_FORBIDDEN,
        )
        self.assertEqual(
            rejected.json()["errors"]["code"],
            "csrf_failed",
        )

        csrf_response = csrf_client.get(self.csrf_url)
        csrf_token = csrf_response.data["data"]["csrf_token"]
        accepted = csrf_client.post(
            self.refresh_url,
            {},
            format="json",
            HTTP_X_CSRFTOKEN=csrf_token,
        )
        self.assertEqual(
            accepted.status_code,
            status.HTTP_200_OK,
        )

    def test_logout_without_cookie_remains_idempotent(self):
        response = self.client.post(
            self.logout_url,
            {},
            format="json",
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_200_OK,
        )

    @override_settings(REFRESH_TOKEN_COOKIE_SECURE=True)
    def test_refresh_cookie_uses_hardened_browser_attributes(self):
        self.set_refresh_cookie()

        response = self.client.post(
            self.refresh_url,
            {},
            format="json",
        )

        cookie = response.cookies[settings.REFRESH_TOKEN_COOKIE_NAME]
        self.assertTrue(cookie["httponly"])
        self.assertTrue(cookie["secure"])
        self.assertEqual(cookie["samesite"], "Lax")
        self.assertEqual(cookie["path"], "/api/v1/identity/session/")
