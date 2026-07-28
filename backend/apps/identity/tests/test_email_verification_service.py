from datetime import timedelta
from unittest.mock import patch

from common.exceptions.modules.identity import (
    EmailVerificationAttemptLimitReached,
    EmailVerificationChallengeNotFound,
    EmailVerificationCodeExpired,
    EmailVerificationCodeInvalid,
)
from django.contrib.auth import get_user_model
from django.contrib.auth.hashers import (
    check_password,
    make_password,
)
from django.core import mail
from django.test import TestCase, override_settings
from django.utils import timezone

from ..models import EmailVerificationChallenge
from ..services import (
    issue_email_verification_challenge,
    verify_email_verification_code,
)

User = get_user_model()


@override_settings(
    EMAIL_BACKEND=("django.core.mail.backends.locmem.EmailBackend"),
    EMAIL_VERIFICATION_CODE_LENGTH=6,
    EMAIL_VERIFICATION_TTL_MINUTES=10,
    EMAIL_VERIFICATION_MAX_ATTEMPTS=5,
    DEFAULT_FROM_EMAIL="TEED <no-reply@teed.local>",
)
class EmailVerificationServiceTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            email="verification@example.com",
            password="StrongTestPassword123!",
        )

    @patch(
        "apps.identity.services.email_verification._generate_verification_code",
        return_value="123456",
    )
    def test_issue_challenge_hashes_and_emails_code(
        self,
        generate_code,
    ):
        challenge = issue_email_verification_challenge(
            user=self.user,
        )

        generate_code.assert_called_once_with()

        self.assertNotEqual(
            challenge.code_digest,
            "123456",
        )
        self.assertTrue(
            check_password(
                "123456",
                challenge.code_digest,
            )
        )
        self.assertEqual(
            challenge.max_attempts,
            5,
        )

        self.assertEqual(len(mail.outbox), 1)
        self.assertEqual(
            mail.outbox[0].to,
            ["verification@example.com"],
        )
        self.assertIn(
            "123456",
            mail.outbox[0].body,
        )

    @patch(
        "apps.identity.services.email_verification._generate_verification_code",
        side_effect=["111111", "222222"],
    )
    def test_new_challenge_invalidates_previous_one(
        self,
        generate_code,
    ):
        first_challenge = issue_email_verification_challenge(
            user=self.user,
        )

        second_challenge = issue_email_verification_challenge(
            user=self.user,
        )

        first_challenge.refresh_from_db()

        self.assertTrue(first_challenge.is_deleted)
        self.assertIsNotNone(
            first_challenge.deleted_at,
        )
        self.assertFalse(second_challenge.is_deleted)
        self.assertEqual(len(mail.outbox), 2)

    def test_user_without_email_is_rejected(self):
        phone_user = User.objects.create_user(
            phone_number="+255700000099",
        )

        with self.assertRaisesMessage(
            ValueError,
            ("An email address is required for email verification."),
        ):
            issue_email_verification_challenge(
                user=phone_user,
            )

        self.assertEqual(len(mail.outbox), 0)
        self.assertFalse(
            EmailVerificationChallenge.objects.filter(
                user=phone_user,
            ).exists()
        )

    @patch(
        "apps.identity.services.email_verification._generate_verification_code",
        return_value="123456",
    )
    def test_valid_code_verifies_user(
        self,
        generate_code,
    ):
        challenge = issue_email_verification_challenge(
            user=self.user,
        )

        verified_user = verify_email_verification_code(
            user=self.user,
            code="123456",
        )

        challenge.refresh_from_db()
        verified_user.refresh_from_db()

        self.assertTrue(verified_user.is_email_verified)
        self.assertTrue(challenge.is_consumed)

    @patch(
        "apps.identity.services.email_verification._generate_verification_code",
        return_value="123456",
    )
    def test_invalid_code_increments_attempt_count(
        self,
        generate_code,
    ):
        challenge = issue_email_verification_challenge(
            user=self.user,
        )

        with self.assertRaises(EmailVerificationCodeInvalid):
            verify_email_verification_code(
                user=self.user,
                code="654321",
            )

        challenge.refresh_from_db()

        self.assertEqual(
            challenge.attempt_count,
            1,
        )
        self.user.refresh_from_db()
        self.assertFalse(self.user.is_email_verified)

    def test_expired_code_is_rejected(self):
        EmailVerificationChallenge.objects.create(
            user=self.user,
            code_digest=make_password("123456"),
            expires_at=(timezone.now() - timedelta(seconds=1)),
        )

        with self.assertRaises(EmailVerificationCodeExpired):
            verify_email_verification_code(
                user=self.user,
                code="123456",
            )

    def test_missing_challenge_is_rejected(self):
        with self.assertRaises(EmailVerificationChallengeNotFound):
            verify_email_verification_code(
                user=self.user,
                code="123456",
            )

    def test_attempt_limited_challenge_is_rejected(
        self,
    ):
        EmailVerificationChallenge.objects.create(
            user=self.user,
            code_digest=make_password("123456"),
            expires_at=(timezone.now() + timedelta(minutes=10)),
            attempt_count=5,
            max_attempts=5,
        )

        with self.assertRaises(EmailVerificationAttemptLimitReached):
            verify_email_verification_code(
                user=self.user,
                code="123456",
            )
