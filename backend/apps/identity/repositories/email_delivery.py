from django.db.models import Q
from django.utils import timezone

from ..models import EmailDelivery


def create_email_delivery(**fields) -> tuple[EmailDelivery, bool]:
    return EmailDelivery.objects.get_or_create(
        idempotency_key=fields.pop("idempotency_key"),
        defaults=fields,
    )


def claim_due_email_delivery(*, stale_before) -> EmailDelivery | None:
    return (
        EmailDelivery.objects.select_for_update(skip_locked=True)
        .select_related("user")
        .filter(
            Q(
                status__in=[
                    EmailDelivery.Status.PENDING,
                    EmailDelivery.Status.RETRY,
                ],
                next_attempt_at__lte=timezone.now(),
            )
            | Q(
                status=EmailDelivery.Status.PROCESSING,
                locked_at__lte=stale_before,
            )
        )
        .order_by("next_attempt_at", "created_at")
        .first()
    )
