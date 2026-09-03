from datetime import datetime

from django.db.models import F
from django.utils import timezone

from ..models import PhoneVerificationChallenge, User


def create_phone_verification_challenge(
    *,
    user: User,
    code_digest: str,
    expires_at: datetime,
    purpose: str = PhoneVerificationChallenge.Purpose.REGISTRATION,
    max_attempts: int = 5,
) -> PhoneVerificationChallenge:
    return PhoneVerificationChallenge.objects.create(
        user=user,
        purpose=purpose,
        code_digest=code_digest,
        expires_at=expires_at,
        max_attempts=max_attempts,
    )


def invalidate_outstanding_phone_verification_challenges(
    *,
    user: User,
    purpose: str = PhoneVerificationChallenge.Purpose.REGISTRATION,
) -> int:
    return PhoneVerificationChallenge.objects.filter(
        user=user,
        purpose=purpose,
        consumed_at__isnull=True,
    ).update(is_deleted=True, deleted_at=timezone.now())


def increment_phone_verification_attempt(
    *,
    challenge: PhoneVerificationChallenge,
) -> PhoneVerificationChallenge:
    PhoneVerificationChallenge.objects.filter(id=challenge.id).update(
        attempt_count=F("attempt_count") + 1,
        updated_at=timezone.now(),
    )
    challenge.refresh_from_db()
    return challenge


def get_phone_verification_challenge_for_update(
    *,
    user: User,
    purpose: str = PhoneVerificationChallenge.Purpose.REGISTRATION,
) -> PhoneVerificationChallenge | None:
    return (
        PhoneVerificationChallenge.objects.select_for_update()
        .filter(
            user=user,
            purpose=purpose,
            consumed_at__isnull=True,
        )
        .order_by("-created_at")
        .first()
    )


def get_latest_phone_challenge_including_invalidated(
    *,
    user: User,
    purpose: str,
) -> PhoneVerificationChallenge | None:
    return (
        PhoneVerificationChallenge.all_objects.filter(user=user, purpose=purpose)
        .order_by("-created_at")
        .first()
    )


def count_phone_challenges_since(*, user: User, purpose: str, since) -> int:
    return PhoneVerificationChallenge.all_objects.filter(
        user=user,
        purpose=purpose,
        created_at__gte=since,
    ).count()


def consume_phone_verification_challenge(
    *,
    challenge: PhoneVerificationChallenge,
) -> PhoneVerificationChallenge:
    challenge.consumed_at = timezone.now()
    challenge.save(update_fields=["consumed_at", "updated_at"])
    return challenge
