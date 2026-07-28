from datetime import timedelta

from django.contrib.auth import get_user_model
from django.test import TestCase
from django.utils import timezone

from ..models import UserSession

User = get_user_model()


class UserSessionModelTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            email="session-model@example.com",
            password="StrongTestPassword123!",
        )

    def test_session_is_active_before_expiry_and_revocation(self):
        session = UserSession.objects.create(
            user=self.user,
            expires_at=timezone.now() + timedelta(days=7),
        )

        self.assertTrue(session.is_active)

    def test_revoked_or_expired_session_is_inactive(self):
        revoked = UserSession.objects.create(
            user=self.user,
            expires_at=timezone.now() + timedelta(days=7),
            revoked_at=timezone.now(),
            revoke_reason=UserSession.RevokeReason.LOGOUT,
        )
        expired = UserSession.objects.create(
            user=self.user,
            expires_at=timezone.now() - timedelta(seconds=1),
        )

        self.assertFalse(revoked.is_active)
        self.assertFalse(expired.is_active)
