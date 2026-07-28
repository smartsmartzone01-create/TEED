from datetime import datetime

from django.db.models import F
from django.utils import timezone

from ..models import (
    EmailVerificationChallenge,
    User,
)


def create_email_verification_challenge(
    *,
    user: User,
    code_digest: str,
    expires_at: datetime,
    purpose: str = (EmailVerificationChallenge.Purpose.REGISTRATION),
    max_attempts: int = 5,
) -> EmailVerificationChallenge:
    """
    Persist an email-verification challenge.
    """

    return EmailVerificationChallenge.objects.create(
        user=user,
        purpose=purpose,
        code_digest=code_digest,
        expires_at=expires_at,
        max_attempts=max_attempts,
    )


def invalidate_outstanding_email_verification_challenges(
    *,
    user: User,
    purpose: str = (EmailVerificationChallenge.Purpose.REGISTRATION),
) -> int:
    """
    Soft-delete outstanding challenges for this user
    and purpose.

    Return the number of challenges invalidated.
    """

    return EmailVerificationChallenge.objects.filter(
        user=user,
        purpose=purpose,
        consumed_at__isnull=True,
    ).update(
        is_deleted=True,
        deleted_at=timezone.now(),
    )


def increment_email_verification_attempt(
    *,
    challenge: EmailVerificationChallenge,
) -> EmailVerificationChallenge:
    """
    Atomically record one failed verification attempt.
    """

    EmailVerificationChallenge.objects.filter(
        id=challenge.id,
    ).update(
        attempt_count=F("attempt_count") + 1,
        updated_at=timezone.now(),
    )

    challenge.refresh_from_db()

    return challenge


def get_email_verification_challenge_for_update(
    *,
    user: User,
    purpose: str = (EmailVerificationChallenge.Purpose.REGISTRATION),
) -> EmailVerificationChallenge | None:
    return (
        EmailVerificationChallenge.objects.select_for_update()
        .filter(
            user=user,
            purpose=purpose,
            consumed_at__isnull=True,
        )
        .order_by("-created_at")
        .first()
    )


def get_latest_email_challenge_including_invalidated(
    *,
    user: User,
    purpose: str,
) -> EmailVerificationChallenge | None:
    return (
        EmailVerificationChallenge.all_objects.filter(
            user=user,
            purpose=purpose,
        )
        .order_by("-created_at")
        .first()
    )


def count_email_challenges_since(
    *,
    user: User,
    purpose: str,
    since,
) -> int:
    return EmailVerificationChallenge.all_objects.filter(
        user=user,
        purpose=purpose,
        created_at__gte=since,
    ).count()


def consume_email_verification_challenge(
    *,
    challenge: EmailVerificationChallenge,
) -> EmailVerificationChallenge:
    """
    Mark a successfully verified challenge as consumed.
    """

    challenge.consumed_at = timezone.now()
    challenge.save(
        update_fields=[
            "consumed_at",
            "updated_at",
        ]
    )

    return challenge
