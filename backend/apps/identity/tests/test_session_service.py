from common.exceptions.modules.identity import (
    RefreshTokenReuseDetected,
    SessionExpired,
)
from django.contrib.auth import get_user_model
from django.test import TestCase
from rest_framework_simplejwt.token_blacklist.models import (
    BlacklistedToken,
    OutstandingToken,
)
from rest_framework_simplejwt.tokens import AccessToken, RefreshToken

from ..models import UserSession
from ..services import (
    issue_token_pair,
    revoke_all_user_sessions,
    revoke_refresh_session,
    rotate_refresh_token,
)

User = get_user_model()


class SessionServiceTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            email="session-service@example.com",
            password="StrongTestPassword123!",
            is_email_verified=True,
        )

    def test_issue_token_pair_creates_bound_session(self):
        tokens = issue_token_pair(
            user=self.user,
            ip_address="192.0.2.20",
            user_agent="TEED Test Browser",
        )

        session = UserSession.objects.get(
            id=tokens["session_id"],
        )
        access = AccessToken(tokens["access"])
        refresh = RefreshToken(tokens["refresh"])

        self.assertEqual(session.user, self.user)
        self.assertEqual(session.ip_address, "192.0.2.20")
        self.assertTrue(session.user_agent_hash)
        self.assertEqual(
            access["session_id"],
            str(session.id),
        )
        self.assertEqual(
            refresh["session_id"],
            str(session.id),
        )
        self.assertEqual(
            session.current_refresh_jti,
            tokens["refresh_jti"],
        )

    def test_refresh_rotates_jti_without_extending_session(self):
        original = issue_token_pair(user=self.user)
        session = UserSession.objects.get(
            id=original["session_id"],
        )
        absolute_expiry = session.expires_at

        rotated = rotate_refresh_token(
            raw_refresh_token=original["refresh"],
        )

        session.refresh_from_db()
        self.assertNotEqual(
            rotated["refresh_jti"],
            original["refresh_jti"],
        )
        self.assertEqual(
            session.current_refresh_jti,
            rotated["refresh_jti"],
        )
        self.assertEqual(
            session.expires_at,
            absolute_expiry,
        )
        self.assertTrue(
            BlacklistedToken.objects.filter(
                token__jti=original["refresh_jti"].hex,
            ).exists()
        )

    def test_reusing_rotated_refresh_revokes_token_family(self):
        original = issue_token_pair(user=self.user)
        rotated = rotate_refresh_token(
            raw_refresh_token=original["refresh"],
        )

        with self.assertRaises(RefreshTokenReuseDetected):
            rotate_refresh_token(
                raw_refresh_token=original["refresh"],
            )

        session = UserSession.objects.get(
            id=original["session_id"],
        )
        self.assertEqual(
            session.revoke_reason,
            UserSession.RevokeReason.REFRESH_REUSE,
        )
        self.assertTrue(
            BlacklistedToken.objects.filter(
                token__jti=rotated["refresh_jti"].hex,
            ).exists()
        )

    def test_expired_session_is_revoked_during_refresh(self):
        tokens = issue_token_pair(user=self.user)
        session = UserSession.objects.get(
            id=tokens["session_id"],
        )
        session.expires_at = session.created_at
        session.save(
            update_fields=[
                "expires_at",
                "updated_at",
            ]
        )

        with self.assertRaises(SessionExpired):
            rotate_refresh_token(
                raw_refresh_token=tokens["refresh"],
            )

        session.refresh_from_db()
        self.assertEqual(
            session.revoke_reason,
            UserSession.RevokeReason.EXPIRED,
        )

    def test_logout_revokes_current_session(self):
        tokens = issue_token_pair(user=self.user)

        revoke_refresh_session(
            raw_refresh_token=tokens["refresh"],
        )

        session = UserSession.objects.get(
            id=tokens["session_id"],
        )
        self.assertEqual(
            session.revoke_reason,
            UserSession.RevokeReason.LOGOUT,
        )

    def test_logout_all_revokes_every_active_session(self):
        first = issue_token_pair(user=self.user)
        second = issue_token_pair(user=self.user)

        revoked_count = revoke_all_user_sessions(
            user=self.user,
        )

        self.assertEqual(revoked_count, 2)
        self.assertFalse(
            UserSession.objects.filter(
                user=self.user,
                revoked_at__isnull=True,
            ).exists()
        )
        current_jtis = [
            first["refresh_jti"],
            second["refresh_jti"],
        ]
        self.assertEqual(
            BlacklistedToken.objects.filter(
                token__jti__in=[jti.hex for jti in current_jtis],
            ).count(),
            2,
        )

    def test_session_tokens_are_tracked_as_outstanding(self):
        tokens = issue_token_pair(user=self.user)

        self.assertTrue(
            OutstandingToken.objects.filter(
                jti=tokens["refresh_jti"].hex,
                user=self.user,
            ).exists()
        )
