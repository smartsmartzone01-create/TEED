from unittest.mock import patch

from django.test import TestCase, override_settings
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APIClient

from ..models import User


@override_settings(
    EMAIL_BACKEND="django.core.mail.backends.locmem.EmailBackend",
)
class PasswordResetAPITests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(
            email="reset@example.com",
            password="Old-Password-123!",
        )
        self.user.is_email_verified = True
        self.user.save(update_fields=["is_email_verified", "updated_at"])

    @patch(
        "apps.identity.services.email_verification._generate_verification_code",
        return_value="123456",
    )
    def test_complete_password_reset_flow(self, _mock_code):
        with self.captureOnCommitCallbacks(execute=True):
            request_response = self.client.post(
                reverse("identity:password-reset-request"),
                {"email": self.user.email},
                format="json",
            )
        self.assertEqual(request_response.status_code, status.HTTP_200_OK)
        self.assertIn("teed_device", request_response.cookies)

        verify_response = self.client.post(
            reverse("identity:password-reset-verify"),
            {"email": self.user.email, "code": "123456"},
            format="json",
        )
        self.assertEqual(verify_response.status_code, status.HTTP_200_OK)
        reset_cookie = verify_response.cookies["teed_password_reset"]
        self.assertTrue(reset_cookie["httponly"])
        self.assertEqual(
            reset_cookie["path"],
            "/api/v1/identity/password-reset/",
        )

        with self.captureOnCommitCallbacks(execute=True):
            confirm_response = self.client.post(
                reverse("identity:password-reset-confirm"),
                {
                    "new_password": "New-Password-456!",
                    "new_password_confirm": "New-Password-456!",
                },
                format="json",
            )
        self.assertEqual(confirm_response.status_code, status.HTTP_200_OK)
        self.user.refresh_from_db()
        self.assertTrue(self.user.check_password("New-Password-456!"))

    def test_request_response_does_not_reveal_account_existence(self):
        known = self.client.post(
            reverse("identity:password-reset-request"),
            {"email": self.user.email},
            format="json",
        )
        unknown = APIClient().post(
            reverse("identity:password-reset-request"),
            {"email": "unknown@example.com"},
            format="json",
        )

        self.assertEqual(known.status_code, unknown.status_code)
        self.assertEqual(known.data["message"], unknown.data["message"])

    def test_confirm_rejects_mismatched_passwords(self):
        response = self.client.post(
            reverse("identity:password-reset-confirm"),
            {
                "new_password": "New-Password-456!",
                "new_password_confirm": "Different-Password-789!",
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
