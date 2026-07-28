from datetime import timedelta
from io import StringIO

from django.core.management import call_command
from django.db import transaction
from django.test import TestCase, override_settings
from django.utils import timezone

from ..email import DeliveryProviderError, DeliveryReceipt
from ..models import EmailDelivery, IdentitySecurityEvent, User
from ..services import (
    enqueue_email_delivery,
    process_one_email_delivery,
)
from ..services.email_delivery_crypto import decrypt_delivery_payload


class SuccessfulProvider:
    messages = []

    def send(self, *, message, idempotency_key):
        self.messages.append(message)
        return DeliveryReceipt(provider_message_id="provider-123")


class TemporaryFailureProvider:
    def send(self, *, message, idempotency_key):
        raise DeliveryProviderError("temporary_failure")


class PermanentFailureProvider:
    def send(self, *, message, idempotency_key):
        raise DeliveryProviderError("invalid_recipient", permanent=True)


@override_settings(
    EMAIL_DELIVERY_AUTOPROCESS=False,
    EMAIL_DELIVERY_ENCRYPTION_KEY="",
    EMAIL_DELIVERY_RETRY_BASE_SECONDS=60,
    EMAIL_DELIVERY_RETRY_MAX_SECONDS=3600,
)
class EmailDeliveryServiceTests(TestCase):
    def setUp(self):
        SuccessfulProvider.messages.clear()
        self.user = User.objects.create_user(
            email="delivery@example.com",
            password="Strong-Password-123!",
        )

    def enqueue(self, **overrides):
        values = {
            "user": self.user,
            "template": EmailDelivery.Template.EMAIL_VERIFICATION,
            "payload": {"code": "123456"},
            "idempotency_key": "delivery-test",
        }
        values.update(overrides)
        return enqueue_email_delivery(**values)

    def test_payload_is_encrypted_and_recipient_is_hashed(self):
        delivery = self.enqueue()

        self.assertNotIn("123456", delivery.encrypted_payload)
        self.assertNotEqual(delivery.recipient_hash, self.user.email)
        self.assertEqual(
            decrypt_delivery_payload(delivery.encrypted_payload),
            {"code": "123456"},
        )

    def test_idempotency_key_returns_existing_delivery(self):
        first = self.enqueue()
        second = self.enqueue(payload={"code": "999999"})

        self.assertEqual(first.id, second.id)
        self.assertEqual(EmailDelivery.objects.count(), 1)
        self.assertEqual(
            decrypt_delivery_payload(second.encrypted_payload)["code"],
            "123456",
        )

    def test_outbox_row_rolls_back_with_business_transaction(self):
        with self.assertRaises(RuntimeError):
            with transaction.atomic():
                self.enqueue()
                raise RuntimeError("rollback")

        self.assertFalse(EmailDelivery.objects.exists())

    @override_settings(
        EMAIL_DELIVERY_PROVIDER=(
            "apps.identity.tests.test_email_delivery.SuccessfulProvider"
        )
    )
    def test_success_marks_sent_and_erases_encrypted_payload(self):
        delivery = self.enqueue()

        self.assertTrue(process_one_email_delivery())

        delivery.refresh_from_db()
        self.assertEqual(delivery.status, EmailDelivery.Status.SENT)
        self.assertEqual(delivery.encrypted_payload, "")
        self.assertEqual(delivery.provider_message_id, "provider-123")
        self.assertIn("123456", SuccessfulProvider.messages[0].body)

    @override_settings(
        EMAIL_DELIVERY_PROVIDER=(
            "apps.identity.tests.test_email_delivery.TemporaryFailureProvider"
        )
    )
    def test_temporary_failure_schedules_exponential_retry(self):
        delivery = self.enqueue()

        process_one_email_delivery()

        delivery.refresh_from_db()
        self.assertEqual(delivery.status, EmailDelivery.Status.RETRY)
        self.assertEqual(delivery.attempt_count, 1)
        self.assertGreater(delivery.next_attempt_at, timezone.now())
        self.assertTrue(delivery.encrypted_payload)

    @override_settings(
        EMAIL_DELIVERY_PROVIDER=(
            "apps.identity.tests.test_email_delivery.PermanentFailureProvider"
        )
    )
    def test_permanent_failure_moves_to_dead_letter_and_erases_payload(self):
        delivery = self.enqueue()

        process_one_email_delivery()

        delivery.refresh_from_db()
        self.assertEqual(delivery.status, EmailDelivery.Status.DEAD)
        self.assertEqual(delivery.encrypted_payload, "")
        self.assertTrue(
            IdentitySecurityEvent.objects.filter(
                event_type=IdentitySecurityEvent.EventType.EMAIL_DELIVERY_DEAD,
                metadata__reason="invalid_recipient",
            ).exists()
        )

    def test_expired_delivery_does_not_call_provider(self):
        delivery = self.enqueue(expires_at=timezone.now() - timedelta(seconds=1))

        process_one_email_delivery()

        delivery.refresh_from_db()
        self.assertEqual(delivery.status, EmailDelivery.Status.DEAD)
        self.assertEqual(delivery.last_error_code, "delivery_expired")

    @override_settings(
        EMAIL_DELIVERY_PROVIDER=(
            "apps.identity.tests.test_email_delivery.SuccessfulProvider"
        )
    )
    def test_management_command_processes_limited_batch(self):
        self.enqueue()
        output = StringIO()

        call_command("process_email_deliveries", limit=1, stdout=output)

        self.assertIn("Processed 1 email delivery job", output.getvalue())

    def test_retention_command_deletes_only_old_terminal_jobs(self):
        old = self.enqueue()
        old.status = EmailDelivery.Status.SENT
        old.encrypted_payload = ""
        old.save()
        EmailDelivery.objects.filter(pk=old.pk).update(
            updated_at=timezone.now() - timedelta(days=31)
        )
        current = self.enqueue(idempotency_key="current-delivery")
        current.status = EmailDelivery.Status.DEAD
        current.encrypted_payload = ""
        current.save()

        call_command("purge_email_deliveries", stdout=StringIO())

        self.assertFalse(EmailDelivery.all_objects.filter(pk=old.pk).exists())
        self.assertTrue(EmailDelivery.all_objects.filter(pk=current.pk).exists())
