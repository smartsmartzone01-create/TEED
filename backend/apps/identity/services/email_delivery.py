from datetime import timedelta

from django.conf import settings
from django.db import transaction
from django.utils import timezone
from django.utils.module_loading import import_string

from ..email import DeliveryProviderError
from ..models import EmailDelivery, IdentitySecurityEvent, User
from ..repositories import (
    claim_due_email_delivery,
    claim_email_delivery,
    create_email_delivery,
)
from .email_delivery_crypto import (
    DeliveryPayloadInvalid,
    decrypt_delivery_payload,
    encrypt_delivery_payload,
)
from .email_templates import render_email_delivery
from .security_event import (
    hash_identity_identifier,
    record_identity_security_event,
)


def enqueue_email_delivery(
    *,
    user: User,
    template: str,
    payload: dict,
    idempotency_key: str,
    challenge_id=None,
    expires_at=None,
) -> EmailDelivery:
    if not user.email:
        raise ValueError("An email recipient is required.")
    delivery, created = create_email_delivery(
        user=user,
        template=template,
        idempotency_key=idempotency_key,
        recipient_hash=hash_identity_identifier(user.email),
        encrypted_payload=encrypt_delivery_payload(payload),
        challenge_id=challenge_id,
        max_attempts=settings.EMAIL_DELIVERY_MAX_ATTEMPTS,
        expires_at=expires_at
        or timezone.now() + timedelta(hours=settings.EMAIL_DELIVERY_TTL_HOURS),
    )
    if created:
        record_identity_security_event(
            user=user,
            event_type=IdentitySecurityEvent.EventType.EMAIL_DELIVERY_QUEUED,
            outcome=IdentitySecurityEvent.Outcome.SUCCESS,
            challenge_id=challenge_id,
            metadata={"template": template},
        )
        if settings.EMAIL_DELIVERY_AUTOPROCESS:
            transaction.on_commit(
                lambda delivery_id=delivery.id: process_email_delivery(
                    delivery_id=delivery_id
                )
            )
    return delivery


def _provider():
    provider_class = import_string(settings.EMAIL_DELIVERY_PROVIDER)
    return provider_class()


def _claim_one() -> EmailDelivery | None:
    with transaction.atomic():
        delivery = claim_due_email_delivery(
            stale_before=timezone.now()
            - timedelta(seconds=settings.EMAIL_DELIVERY_LOCK_TIMEOUT_SECONDS)
        )
        if delivery is None:
            return None
        delivery.status = EmailDelivery.Status.PROCESSING
        delivery.locked_at = timezone.now()
        delivery.attempt_count += 1
        delivery.save(
            update_fields=[
                "status",
                "locked_at",
                "attempt_count",
                "updated_at",
            ]
        )
        return delivery


def _claim_by_id(*, delivery_id) -> EmailDelivery | None:
    with transaction.atomic():
        delivery = claim_email_delivery(
            delivery_id=delivery_id,
            stale_before=timezone.now()
            - timedelta(seconds=settings.EMAIL_DELIVERY_LOCK_TIMEOUT_SECONDS),
        )
        if delivery is None:
            return None
        delivery.status = EmailDelivery.Status.PROCESSING
        delivery.locked_at = timezone.now()
        delivery.attempt_count += 1
        delivery.save(
            update_fields=[
                "status",
                "locked_at",
                "attempt_count",
                "updated_at",
            ]
        )
        return delivery


def _finish_success(*, delivery, receipt):
    delivery.status = EmailDelivery.Status.SENT
    delivery.sent_at = timezone.now()
    delivery.locked_at = None
    delivery.provider_message_id = receipt.provider_message_id
    delivery.last_error_code = ""
    delivery.encrypted_payload = ""
    delivery.save(
        update_fields=[
            "status",
            "sent_at",
            "locked_at",
            "provider_message_id",
            "last_error_code",
            "encrypted_payload",
            "updated_at",
        ]
    )
    record_identity_security_event(
        user=delivery.user,
        event_type=IdentitySecurityEvent.EventType.EMAIL_DELIVERY_SUCCEEDED,
        outcome=IdentitySecurityEvent.Outcome.SUCCESS,
        challenge_id=delivery.challenge_id,
        metadata={
            "template": delivery.template,
            "attempt": delivery.attempt_count,
        },
    )


def _finish_failure(*, delivery, error_code, permanent=False):
    now = timezone.now()
    dead = (
        permanent
        or delivery.attempt_count >= delivery.max_attempts
        or delivery.expires_at <= now
    )
    delivery.status = EmailDelivery.Status.DEAD if dead else EmailDelivery.Status.RETRY
    delivery.locked_at = None
    delivery.last_error_code = error_code
    if dead:
        delivery.encrypted_payload = ""
    else:
        delay = min(
            settings.EMAIL_DELIVERY_RETRY_MAX_SECONDS,
            settings.EMAIL_DELIVERY_RETRY_BASE_SECONDS
            * (2 ** (delivery.attempt_count - 1)),
        )
        delivery.next_attempt_at = now + timedelta(seconds=delay)
    delivery.save(
        update_fields=[
            "status",
            "locked_at",
            "last_error_code",
            "encrypted_payload",
            "next_attempt_at",
            "updated_at",
        ]
    )
    record_identity_security_event(
        user=delivery.user,
        event_type=(
            IdentitySecurityEvent.EventType.EMAIL_DELIVERY_DEAD
            if dead
            else IdentitySecurityEvent.EventType.EMAIL_DELIVERY_RETRY
        ),
        outcome=(
            IdentitySecurityEvent.Outcome.FAILURE
            if dead
            else IdentitySecurityEvent.Outcome.BLOCKED
        ),
        challenge_id=delivery.challenge_id,
        metadata={
            "template": delivery.template,
            "attempt": delivery.attempt_count,
            "reason": error_code,
        },
    )


def _process_delivery(delivery) -> bool:
    if delivery is None:
        return False
    if delivery.expires_at <= timezone.now():
        _finish_failure(
            delivery=delivery,
            error_code="delivery_expired",
            permanent=True,
        )
        return True
    try:
        payload = decrypt_delivery_payload(delivery.encrypted_payload)
        message = render_email_delivery(delivery=delivery, payload=payload)
        receipt = _provider().send(
            message=message,
            idempotency_key=delivery.idempotency_key,
        )
    except DeliveryPayloadInvalid:
        _finish_failure(
            delivery=delivery,
            error_code="payload_invalid",
            permanent=True,
        )
    except DeliveryProviderError as exc:
        _finish_failure(
            delivery=delivery,
            error_code=exc.code,
            permanent=exc.permanent,
        )
    except Exception:
        _finish_failure(
            delivery=delivery,
            error_code="delivery_internal_error",
        )
    else:
        _finish_success(delivery=delivery, receipt=receipt)
    return True


def process_email_delivery(*, delivery_id) -> bool:
    return _process_delivery(_claim_by_id(delivery_id=delivery_id))


def process_one_email_delivery() -> bool:
    return _process_delivery(_claim_one())


def process_email_deliveries(*, limit: int) -> int:
    processed = 0
    while processed < limit and process_one_email_delivery():
        processed += 1
    return processed
