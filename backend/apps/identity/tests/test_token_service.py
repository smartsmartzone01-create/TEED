from django.contrib.auth import get_user_model
from django.test import TestCase
from rest_framework_simplejwt.token_blacklist.models import (
    OutstandingToken,
)
from rest_framework_simplejwt.tokens import (
    AccessToken,
    RefreshToken,
)

from ..services import issue_token_pair

User = get_user_model()


class TokenServiceTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            email="tokens@example.com",
            password="StrongTestPassword123!",
        )

    def test_issue_token_pair(self):
        tokens = issue_token_pair(
            user=self.user,
        )

        self.assertIn("access", tokens)
        self.assertIn("refresh", tokens)
        self.assertEqual(
            tokens["token_type"],
            "Bearer",
        )

        access = AccessToken(tokens["access"])
        refresh = RefreshToken(tokens["refresh"])

        self.assertEqual(
            access["user_id"],
            str(self.user.id),
        )
        self.assertEqual(
            refresh["user_id"],
            str(self.user.id),
        )

    def test_refresh_token_is_tracked(self):
        issue_token_pair(
            user=self.user,
        )

        self.assertTrue(
            OutstandingToken.objects.filter(
                user=self.user,
            ).exists()
        )

    def test_inactive_user_cannot_receive_tokens(
        self,
    ):
        self.user.is_active = False
        self.user.save(
            update_fields=[
                "is_active",
                "updated_at",
            ]
        )

        with self.assertRaisesMessage(
            ValueError,
            "Inactive users cannot receive tokens.",
        ):
            issue_token_pair(
                user=self.user,
            )
