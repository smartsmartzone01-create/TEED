from datetime import timedelta
from unittest.mock import patch

from common.exceptions.modules.identity import (
    EmailVerificationChallengeNotFound,
    EmailVerificationCodeInvalid,
)
from django.contrib.auth import get_user_model
from django.contrib.auth.hashers import make_password
from django.core import mail
from django.test import override_settings
from django.urls import reverse
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APITestCase
from rest_framework_simplejwt.token_blacklist.models import (
    OutstandingToken,
)

from ..models import EmailVerificationChallenge

User = get_user_model()


@override_settings(
    EMAIL_BACKEND=("django.core.mail.backends.locmem.EmailBackend"),
    EMAIL_VERIFICATION_CODE_LENGTH=6,
    EMAIL_VERIFICATION_TTL_MINUTES=10,
    EMAIL_VERIFICATION_MAX_ATTEMPTS=5,
    DEFAULT_FROM_EMAIL="TEED <no-reply@teed.local>",
)
class EmailVerificationAPITests(APITestCase):
    def setUp(self):
        self.verify_url = reverse("identity:email-verification")
        self.resend_url = reverse("identity:email-verification-resend")
        self.user = User.objects.create_user(
            email="verification@example.com",
            password="StrongTestPassword123!",
        )

    def create_challenge(
        self,
        *,
        code="123456",
    ):
        return EmailVerificationChallenge.objects.create(
            user=self.user,
            code_digest=make_password(code),
            expires_at=(timezone.now() + timedelta(minutes=10)),
        )

    def test_verify_email(self):
        challenge = self.create_challenge()

        response = self.client.post(
            self.verify_url,
            {
                "email": self.user.email,
                "code": "123456",
            },
            format="json",
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_200_OK,
        )
        self.assertTrue(response.data["success"])
        self.assertEqual(
            response.data["data"]["next_step"],
            "complete_onboarding",
        )
        self.assertIn(
            "access",
            response.data["data"]["tokens"],
        )
        self.assertIn(
            "refresh",
            response.data["data"]["tokens"],
        )
        self.assertEqual(
            response.data["data"]["tokens"]["token_type"],
            "Bearer",
        )

        self.user.refresh_from_db()
        challenge.refresh_from_db()

        self.assertTrue(self.user.is_email_verified)
        self.assertTrue(challenge.is_consumed)

    def test_invalid_code_uses_teed_error(self):
        challenge = self.create_challenge()

        response = self.client.post(
            self.verify_url,
            {
                "email": self.user.email,
                "code": "654321",
            },
            format="json",
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_400_BAD_REQUEST,
        )
        self.assertEqual(
            response.data["errors"]["code"],
            EmailVerificationCodeInvalid.default_code,
        )

        challenge.refresh_from_db()

        self.assertEqual(
            challenge.attempt_count,
            1,
        )

    def test_unknown_email_does_not_verify(self):
        response = self.client.post(
            self.verify_url,
            {
                "email": "unknown@example.com",
                "code": "123456",
            },
            format="json",
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_400_BAD_REQUEST,
        )
        self.assertEqual(
            response.data["errors"]["code"],
            (EmailVerificationChallengeNotFound.default_code),
        )

    @patch(
        "apps.identity.services.email_verification._generate_verification_code",
        return_value="222222",
    )
    def test_resend_replaces_existing_challenge(
        self,
        generate_code,
    ):
        old_challenge = self.create_challenge()

        response = self.client.post(
            self.resend_url,
            {
                "email": self.user.email,
            },
            format="json",
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_200_OK,
        )
        self.assertTrue(response.data["success"])

        old_challenge.refresh_from_db()

        self.assertTrue(old_challenge.is_deleted)
        self.assertEqual(len(mail.outbox), 1)
        self.assertIn(
            "222222",
            mail.outbox[0].body,
        )

    def test_unknown_resend_uses_generic_success(
        self,
    ):
        response = self.client.post(
            self.resend_url,
            {
                "email": "unknown@example.com",
            },
            format="json",
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_200_OK,
        )
        self.assertTrue(response.data["success"])
        self.assertIsNone(response.data["data"])
        self.assertEqual(len(mail.outbox), 0)

    def test_consumed_code_cannot_issue_more_tokens(
        self,
    ):
        self.create_challenge(
            code="123456",
        )

        first_response = self.client.post(
            self.verify_url,
            {
                "email": self.user.email,
                "code": "123456",
            },
            format="json",
        )

        self.assertEqual(
            first_response.status_code,
            status.HTTP_200_OK,
        )
        self.assertEqual(
            OutstandingToken.objects.filter(
                user=self.user,
            ).count(),
            1,
        )

        second_response = self.client.post(
            self.verify_url,
            {
                "email": self.user.email,
                "code": "123456",
            },
            format="json",
        )

        self.assertEqual(
            second_response.status_code,
            status.HTTP_400_BAD_REQUEST,
        )
        self.assertEqual(
            second_response.data["errors"]["code"],
            (EmailVerificationChallengeNotFound.default_code),
        )
        self.assertEqual(
            OutstandingToken.objects.filter(
                user=self.user,
            ).count(),
            1,
        )
