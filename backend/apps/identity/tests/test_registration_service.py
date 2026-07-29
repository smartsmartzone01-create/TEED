from unittest.mock import patch

from common.exceptions.modules.identity import (
    EmailAlreadyRegistered,
    EmailVerificationRequired,
)
from django.contrib.auth import get_user_model
from django.core import mail
from django.test import TestCase, override_settings

from ..email import DeliveryProviderError
from ..models import EmailDelivery, EmailVerificationChallenge
from ..services import register_email_user

User = get_user_model()


@override_settings(
    EMAIL_BACKEND=("django.core.mail.backends.locmem.EmailBackend"),
    EMAIL_VERIFICATION_CODE_LENGTH=6,
    EMAIL_VERIFICATION_TTL_MINUTES=10,
    EMAIL_VERIFICATION_MAX_ATTEMPTS=5,
    EMAIL_VERIFICATION_RESEND_COOLDOWN_SECONDS=60,
    EMAIL_VERIFICATION_DAILY_LIMIT=5,
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
        with self.captureOnCommitCallbacks(execute=True):
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

    def test_unverified_account_with_matching_password_resumes_verification(self):
        User.objects.create_user(
            email="member@example.com",
            password="StrongTestPassword123!",
        )

        with self.assertRaises(EmailVerificationRequired):
            register_email_user(
                email="MEMBER@EXAMPLE.COM",
                password="StrongTestPassword123!",
            )

        self.assertEqual(
            User.objects.filter(
                email__iexact="member@example.com",
            ).count(),
            1,
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
        "apps.identity.email.DjangoEmailProvider.send",
        side_effect=DeliveryProviderError("provider_unavailable"),
    )
    def test_delivery_failure_does_not_roll_back_registration(
        self,
        send_email,
    ):
        with self.captureOnCommitCallbacks(execute=True):
            user = register_email_user(
                email="rollback@example.com",
                password="StrongTestPassword123!",
            )

        self.assertTrue(
            User.objects.filter(
                email="rollback@example.com",
            ).exists()
        )
        self.assertTrue(EmailVerificationChallenge.objects.filter(user=user).exists())
        delivery = EmailDelivery.objects.get(user=user)
        self.assertEqual(delivery.status, EmailDelivery.Status.RETRY)
        self.assertEqual(delivery.last_error_code, "provider_unavailable")
