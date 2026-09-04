from unittest.mock import patch

from django.test import TestCase
from django.utils import timezone

from apps.identity.models import (
    ExternalIdentity,
    PhoneVerificationChallenge,
    User,
)
from apps.identity.services.account_protection import (
    get_account_protection_recommendation,
    request_email_account_protection,
    request_phone_account_protection,
)


class AccountProtectionServiceTests(TestCase):
    def _completed_user(self, **fields):
        defaults = {
            "username": "member",
            "country_code": "TZ",
            "phone_number": "+255712345678",
            "onboarding_completed_at": timezone.now(),
        }
        defaults.update(fields)
        return User.objects.create_user(password="StrongTestPassword123!", **defaults)

    def test_email_first_user_is_recommended_to_verify_saved_phone(self):
        user = self._completed_user(
            email="member@example.com",
            is_email_verified=True,
            is_phone_verified=False,
        )

        self.assertEqual(
            get_account_protection_recommendation(user=user),
            "verify_phone",
        )

    def test_phone_first_user_is_recommended_to_add_email(self):
        user = self._completed_user(
            email=None,
            is_email_verified=False,
            is_phone_verified=True,
        )

        self.assertEqual(
            get_account_protection_recommendation(user=user),
            "add_email",
        )

    def test_google_user_does_not_get_email_reverification_after_phone(self):
        user = self._completed_user(
            email="member@thirdparty.example",
            is_email_verified=False,
            is_phone_verified=True,
        )
        ExternalIdentity.objects.create(
            user=user,
            provider=ExternalIdentity.Provider.GOOGLE,
            subject="google-subject",
            email_snapshot=user.email,
        )

        self.assertIsNone(get_account_protection_recommendation(user=user))

    @patch("apps.identity.services.account_protection.issue_phone_verification_challenge")
    def test_phone_protection_uses_saved_phone_and_account_protection_purpose(
        self,
        issue_challenge,
    ):
        user = self._completed_user(
            email="member@example.com",
            is_email_verified=True,
            is_phone_verified=False,
        )

        request_phone_account_protection(user=user)

        issue_challenge.assert_called_once_with(
            user=user,
            purpose=PhoneVerificationChallenge.Purpose.ACCOUNT_PROTECTION,
            enforce_resend_limits=True,
            ip_address=None,
            user_agent="",
            device_id=None,
        )

    @patch("apps.identity.services.account_protection.issue_email_verification_challenge")
    def test_attached_email_cannot_be_swapped_during_protection(
        self,
        issue_challenge,
    ):
        user = self._completed_user(
            email="saved@example.com",
            is_email_verified=False,
            is_phone_verified=True,
        )

        with self.assertRaisesRegex(ValueError, "email_change_not_allowed"):
            request_email_account_protection(
                user=user,
                email="different@example.com",
            )

        issue_challenge.assert_not_called()
