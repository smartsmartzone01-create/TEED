from common.exceptions.modules.identity import (
    EmailVerificationRequired,
    InvalidCredentials,
)
from django.contrib.auth import get_user_model
from django.test import TestCase
from django.utils import timezone
from rest_framework_simplejwt.token_blacklist.models import (
    OutstandingToken,
)

from ..services import login_email_user

User = get_user_model()


class EmailAuthenticationServiceTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            email="login@example.com",
            password="StrongTestPassword123!",
            is_email_verified=True,
        )

    def test_login_incomplete_user(self):
        result = login_email_user(
            email="LOGIN@EXAMPLE.COM",
            password="StrongTestPassword123!",
        )

        self.assertEqual(
            result["user"],
            self.user,
        )
        self.assertEqual(
            result["next_step"],
            "complete_onboarding",
        )
        self.assertIn(
            "access",
            result["tokens"],
        )
        self.assertIn(
            "refresh",
            result["tokens"],
        )

    def test_login_completed_user(self):
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

        result = login_email_user(
            email=self.user.email,
            password="StrongTestPassword123!",
        )

        self.assertEqual(
            result["next_step"],
            "dashboard",
        )

    def test_wrong_password_is_rejected(self):
        with self.assertRaises(InvalidCredentials):
            login_email_user(
                email=self.user.email,
                password="WrongPassword123!",
            )

        self.assertFalse(
            OutstandingToken.objects.filter(
                user=self.user,
            ).exists()
        )

    def test_unknown_email_is_rejected(self):
        with self.assertRaises(InvalidCredentials):
            login_email_user(
                email="unknown@example.com",
                password="StrongTestPassword123!",
            )

    def test_unverified_email_is_rejected(self):
        self.user.is_email_verified = False
        self.user.save(
            update_fields=[
                "is_email_verified",
                "updated_at",
            ]
        )

        with self.assertRaises(EmailVerificationRequired):
            login_email_user(
                email=self.user.email,
                password="StrongTestPassword123!",
            )

        self.assertFalse(
            OutstandingToken.objects.filter(
                user=self.user,
            ).exists()
        )
