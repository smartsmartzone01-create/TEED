from django.contrib.auth import get_user_model
from django.urls import reverse
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APITestCase

from apps.identity.models import IdentitySecurityEvent, UserSession
from apps.identity.services import issue_token_pair, record_identity_security_event


class SecurityAPITests(APITestCase):
    def setUp(self):
        self.password = "StrongTestPassword123!"
        self.user = get_user_model().objects.create_user(
            email="secure@example.com",
            password=self.password,
            username="secure-user",
            is_email_verified=True,
            onboarding_completed_at=timezone.now(),
        )
        self.tokens = issue_token_pair(
            user=self.user,
            ip_address="192.0.2.10",
            user_agent="Mozilla/5.0 (Windows NT 10.0) Chrome/120.0",
        )
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {self.tokens['access']}")

    def test_overview_reports_real_state(self):
        response = self.client.get(reverse("security:overview"))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(response.data["data"]["verified_contacts"]["email"])
        self.assertEqual(response.data["data"]["active_session_count"], 1)
        self.assertTrue(response.data["data"]["recovery"]["email_available"])

    def test_password_change_requires_current_password_and_revokes_others(self):
        other = issue_token_pair(user=self.user)
        invalid = self.client.post(
            reverse("security:password"),
            {
                "current_password": "wrong",
                "new_password": "AnotherStrongPassword123!",
                "confirm_password": "AnotherStrongPassword123!",
            },
            format="json",
        )
        self.assertEqual(invalid.status_code, status.HTTP_400_BAD_REQUEST)

        response = self.client.post(
            reverse("security:password"),
            {
                "current_password": self.password,
                "new_password": "AnotherStrongPassword123!",
                "confirm_password": "AnotherStrongPassword123!",
            },
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["data"]["revoked_other_sessions"], 1)
        self.assertTrue(
            self.user.__class__.objects.get(pk=self.user.pk).check_password(
                "AnotherStrongPassword123!"
            )
        )
        self.assertIsNotNone(UserSession.objects.get(id=other["session_id"]).revoked_at)
        self.assertIsNone(
            UserSession.objects.get(id=self.tokens["session_id"]).revoked_at
        )

    def test_sessions_are_sanitized_and_owned(self):
        response = self.client.get(reverse("security:sessions"))
        item = response.data["data"]["sessions"][0]
        self.assertTrue(item["current"])
        self.assertEqual(item["browser"], "Chrome")
        self.assertNotIn("user_agent_hash", item)
        self.assertNotIn("current_refresh_jti", item)

    def test_revoke_other_sessions_preserves_current(self):
        other = issue_token_pair(user=self.user)
        response = self.client.post(
            reverse("security:revoke-others"), {}, format="json"
        )
        self.assertEqual(response.data["data"]["revoked_sessions"], 1)
        self.assertIsNotNone(UserSession.objects.get(id=other["session_id"]).revoked_at)
        self.assertIsNone(
            UserSession.objects.get(id=self.tokens["session_id"]).revoked_at
        )

    def test_current_session_cannot_be_revoked_with_device_endpoint(self):
        response = self.client.delete(
            reverse(
                "security:session-detail",
                kwargs={"session_id": self.tokens["session_id"]},
            )
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_activity_never_exposes_private_audit_fields(self):
        record_identity_security_event(
            user=self.user,
            event_type=IdentitySecurityEvent.EventType.LOGIN_SUCCEEDED,
            outcome=IdentitySecurityEvent.Outcome.SUCCESS,
            metadata={"reason": "private"},
            user_agent="secret raw value",
        )
        response = self.client.get(reverse("security:activity"))
        item = response.data["data"]["events"][0]
        for forbidden in (
            "metadata",
            "user_agent_hash",
            "identifier_hash",
            "challenge_id",
        ):
            self.assertNotIn(forbidden, item)

    def test_onboarding_and_authentication_are_required(self):
        self.user.onboarding_completed_at = None
        self.user.save(update_fields=["onboarding_completed_at", "updated_at"])
        self.assertEqual(
            self.client.get(reverse("security:overview")).status_code,
            status.HTTP_403_FORBIDDEN,
        )
        self.client.credentials()
        self.assertEqual(
            self.client.get(reverse("security:overview")).status_code,
            status.HTTP_401_UNAUTHORIZED,
        )
