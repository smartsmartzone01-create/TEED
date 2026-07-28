from unittest.mock import patch

from common.exceptions.modules.identity import (
    EmailAlreadyRegistered,
)
from django.contrib.auth import get_user_model
from django.core import mail
from django.test import TestCase, override_settings

from ..models import EmailVerificationChallenge
from ..services import register_email_user

User = get_user_model()


@override_settings(
    EMAIL_BACKEND=("django.core.mail.backends.locmem.EmailBackend"),
    EMAIL_VERIFICATION_CODE_LENGTH=6,
    EMAIL_VERIFICATION_TTL_MINUTES=10,
    EMAIL_VERIFICATION_MAX_ATTEMPTS=5,
    DEFAULT_FROM_EMAIL="TEED <no-reply@teed.local>",
)
class EmailRegistrationServiceTests(TestCase):
    @patch(
        "apps.identity.services.email_verification._generate_verification_code",
        return_value="123456",
    )
    def test_register_email_user(
        self,
        generate_code,
    ):
        user = register_email_user(
            email="NEW@Example.COM",
            password="StrongTestPassword123!",
        )

        self.assertEqual(
            user.email,
            "new@example.com",
        )
        self.assertTrue(
            user.check_password(
                "StrongTestPassword123!",
            )
        )
        self.assertFalse(user.is_email_verified)
        self.assertTrue(
            EmailVerificationChallenge.objects.filter(
                user=user,
            ).exists()
        )
        self.assertEqual(len(mail.outbox), 1)
        self.assertIn(
            "123456",
            mail.outbox[0].body,
        )

    def test_duplicate_email_is_rejected(self):
        User.objects.create_user(
            email="member@example.com",
            password="StrongTestPassword123!",
        )

        with self.assertRaises(EmailAlreadyRegistered):
            register_email_user(
                email="MEMBER@EXAMPLE.COM",
                password="AnotherStrongPassword123!",
            )

        self.assertEqual(
            User.objects.filter(
                email__iexact="member@example.com",
            ).count(),
            1,
        )

    @patch(
        "apps.identity.services.email_verification.send_mail",
        side_effect=RuntimeError("Email delivery failed."),
    )
    def test_registration_rolls_back_when_email_fails(
        self,
        send_email,
    ):
        with self.assertRaises(RuntimeError):
            register_email_user(
                email="rollback@example.com",
                password="StrongTestPassword123!",
            )

        self.assertFalse(
            User.objects.filter(
                email="rollback@example.com",
            ).exists()
        )
        self.assertFalse(EmailVerificationChallenge.objects.exists())
