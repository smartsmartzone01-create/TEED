from datetime import timedelta
from io import StringIO
from uuid import uuid4

from common.exceptions.modules.identity import InvalidCredentials
from django.core.management import call_command
from django.test import TestCase
from django.utils import timezone

from ..models import IdentitySecurityEvent, User
from ..services import login_email_user


class IdentitySecurityAuditTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            email="audit@example.com",
            password="Strong-Password-123!",
        )
        self.user.is_email_verified = True
        self.user.save(update_fields=["is_email_verified", "updated_at"])

    def test_successful_login_records_session_device_ip_and_time(self):
        device_id = uuid4()

        result = login_email_user(
            email=self.user.email,
            password="Strong-Password-123!",
            ip_address="192.0.2.10",
            user_agent="Audit browser",
            device_id=device_id,
        )

        event = IdentitySecurityEvent.objects.get(
            event_type=IdentitySecurityEvent.EventType.LOGIN_SUCCEEDED
        )
        self.assertEqual(event.device_id, device_id)
        self.assertEqual(str(event.ip_address), "192.0.2.10")
        self.assertEqual(str(event.session_id), result["tokens"]["session_id"])
        self.assertTrue(event.user_agent_hash)
        self.assertIsNotNone(event.created_at)

    def test_failed_unknown_login_keeps_only_identifier_hash(self):
        with self.assertRaises(InvalidCredentials):
            login_email_user(
                email="missing@example.com",
                password="Never-Store-Me",
                ip_address="192.0.2.11",
            )

        event = IdentitySecurityEvent.objects.get()
        self.assertIsNone(event.user_id)
        self.assertTrue(event.identifier_hash)
        self.assertNotIn("missing@example.com", str(event.metadata))
        self.assertNotIn("Never-Store-Me", str(event.metadata))

    def test_retention_command_deletes_only_expired_events(self):
        expired = IdentitySecurityEvent.objects.create(
            user=self.user,
            event_type=IdentitySecurityEvent.EventType.LOGIN_FAILED,
            outcome=IdentitySecurityEvent.Outcome.FAILURE,
            expires_at=timezone.now() - timedelta(seconds=1),
        )
        current = IdentitySecurityEvent.objects.create(
            user=self.user,
            event_type=IdentitySecurityEvent.EventType.LOGIN_SUCCEEDED,
            outcome=IdentitySecurityEvent.Outcome.SUCCESS,
            expires_at=timezone.now() + timedelta(days=1),
        )

        call_command("purge_expired_security_events", stdout=StringIO())

        self.assertFalse(
            IdentitySecurityEvent.all_objects.filter(pk=expired.pk).exists()
        )
        self.assertTrue(
            IdentitySecurityEvent.all_objects.filter(pk=current.pk).exists()
        )
