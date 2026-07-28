from datetime import timedelta

from django.contrib.auth import get_user_model
from django.test import TestCase
from django.utils import timezone

from ..models import EmailVerificationChallenge

User = get_user_model()


class EmailVerificationChallengeTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            email="verification@example.com",
            password="StrongTestPassword123!",
        )

    def create_challenge(self, **overrides):
        values = {
            "user": self.user,
            "code_digest": "hashed-verification-code",
            "expires_at": timezone.now() + timedelta(minutes=10),
        }
        values.update(overrides)

        return EmailVerificationChallenge.objects.create(
            **values,
        )

    def test_new_challenge_can_be_attempted(self):
        challenge = self.create_challenge()

        self.assertFalse(challenge.is_expired)
        self.assertFalse(challenge.is_consumed)
        self.assertTrue(challenge.can_attempt)

    def test_expired_challenge_cannot_be_attempted(self):
        challenge = self.create_challenge(
            expires_at=timezone.now() - timedelta(seconds=1),
        )

        self.assertTrue(challenge.is_expired)
        self.assertFalse(challenge.can_attempt)

    def test_consumed_challenge_cannot_be_attempted(self):
        challenge = self.create_challenge(
            consumed_at=timezone.now(),
        )

        self.assertTrue(challenge.is_consumed)
        self.assertFalse(challenge.can_attempt)

    def test_attempt_limit_blocks_further_attempts(self):
        challenge = self.create_challenge(
            attempt_count=5,
            max_attempts=5,
        )

        self.assertFalse(challenge.can_attempt)

    def test_soft_deleted_challenge_cannot_be_attempted(
        self,
    ):
        challenge = self.create_challenge()
        challenge.delete()

        self.assertTrue(challenge.is_deleted)
        self.assertFalse(challenge.can_attempt)
