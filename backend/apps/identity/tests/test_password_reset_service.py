from datetime import timedelta
from unittest.mock import patch
from uuid import uuid4

from common.exceptions.modules.identity import (
    PasswordResetChallengeInvalid,
    PasswordResetGrantInvalid,
)
from django.test import TestCase, override_settings
from django.utils import timezone

from ..models import (
    EmailVerificationChallenge,
    IdentitySecurityEvent,
    PasswordResetGrant,
    User,
    UserSession,
)
from ..services import (
    confirm_password_reset,
    issue_token_pair,
    request_password_reset,
    verify_password_reset_code,
)


@override_settings(
    EMAIL_BACKEND="django.core.mail.backends.locmem.EmailBackend",
    PASSWORD_RESET_REQUESTS_PER_HOUR=3,
)
class PasswordResetServiceTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            email="owner@example.com",
            password="Old-Password-123!",
        )
        self.user.is_email_verified = True
        self.user.save(update_fields=["is_email_verified", "updated_at"])
        self.device_id = uuid4()

    @patch(
        "apps.identity.services.email_verification._generate_verification_code",
        return_value="123456",
    )
    def _request(self, _mock_code):
        request_password_reset(
            email=self.user.email,
            ip_address="127.0.0.1",
            user_agent="Test browser",
            device_id=self.device_id,
        )

    def test_request_creates_password_reset_challenge_and_audit_event(self):
        self._request()

        challenge = EmailVerificationChallenge.objects.get()
        self.assertEqual(
            challenge.purpose,
            EmailVerificationChallenge.Purpose.PASSWORD_RESET,
        )
        event = IdentitySecurityEvent.objects.get(
            event_type=(IdentitySecurityEvent.EventType.PASSWORD_RESET_REQUESTED),
        )
        self.assertEqual(event.device_id, self.device_id)
        self.assertEqual(str(event.ip_address), "127.0.0.1")
        self.assertTrue(event.identifier_hash)
        self.assertGreater(event.expires_at, timezone.now())

    def test_unknown_email_response_path_does_not_create_challenge(self):
        request_password_reset(
            email="unknown@example.com",
            device_id=self.device_id,
        )

        self.assertFalse(EmailVerificationChallenge.objects.exists())
        event = IdentitySecurityEvent.objects.get()
        self.assertIsNone(event.user_id)
        self.assertTrue(event.identifier_hash)
        self.assertNotIn("unknown@example.com", str(event.metadata))

    def test_valid_code_creates_device_bound_single_use_grant(self):
        self._request()

        raw_grant, expires_at = verify_password_reset_code(
            email=self.user.email,
            code="123456",
            device_id=self.device_id,
        )

        grant = PasswordResetGrant.objects.get()
        self.assertNotEqual(grant.token_digest, raw_grant)
        self.assertEqual(grant.device_id, self.device_id)
        self.assertEqual(grant.expires_at, expires_at)

    def test_invalid_code_increments_attempt_and_is_audited(self):
        self._request()

        with self.assertRaises(PasswordResetChallengeInvalid):
            verify_password_reset_code(
                email=self.user.email,
                code="000000",
                device_id=self.device_id,
            )

        challenge = EmailVerificationChallenge.objects.get()
        self.assertEqual(challenge.attempt_count, 1)
        self.assertTrue(
            IdentitySecurityEvent.objects.filter(
                event_type=(IdentitySecurityEvent.EventType.PASSWORD_RESET_CODE_FAILED),
                metadata__reason="invalid_code",
            ).exists()
        )

    def test_confirm_changes_password_and_revokes_existing_sessions(self):
        issue_token_pair(user=self.user, device_id=self.device_id)
        self._request()
        raw_grant, _ = verify_password_reset_code(
            email=self.user.email,
            code="123456",
            device_id=self.device_id,
        )

        confirm_password_reset(
            raw_grant=raw_grant,
            new_password="New-Password-456!",
            device_id=self.device_id,
        )

        self.user.refresh_from_db()
        self.assertTrue(self.user.check_password("New-Password-456!"))
        session = UserSession.objects.get()
        self.assertEqual(
            session.revoke_reason,
            UserSession.RevokeReason.PASSWORD_RESET,
        )
        self.assertIsNotNone(PasswordResetGrant.objects.get().consumed_at)

    def test_grant_cannot_be_used_from_another_device(self):
        self._request()
        raw_grant, _ = verify_password_reset_code(
            email=self.user.email,
            code="123456",
            device_id=self.device_id,
        )

        with self.assertRaises(PasswordResetGrantInvalid):
            confirm_password_reset(
                raw_grant=raw_grant,
                new_password="New-Password-456!",
                device_id=uuid4(),
            )

    def test_expired_grant_is_rejected(self):
        self._request()
        raw_grant, _ = verify_password_reset_code(
            email=self.user.email,
            code="123456",
            device_id=self.device_id,
        )
        PasswordResetGrant.objects.update(
            expires_at=timezone.now() - timedelta(seconds=1)
        )

        with self.assertRaises(PasswordResetGrantInvalid):
            confirm_password_reset(
                raw_grant=raw_grant,
                new_password="New-Password-456!",
                device_id=self.device_id,
            )
