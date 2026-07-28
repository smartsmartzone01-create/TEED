from django.utils import timezone

from ..models import PasswordResetGrant, User


def create_password_reset_grant(
    *,
    user: User,
    challenge_id,
    token_digest: str,
    expires_at,
    device_id=None,
) -> PasswordResetGrant:
    return PasswordResetGrant.objects.create(
        user=user,
        challenge_id=challenge_id,
        token_digest=token_digest,
        expires_at=expires_at,
        device_id=device_id,
    )


def get_password_reset_grant_for_update(
    *,
    token_digest: str,
) -> PasswordResetGrant | None:
    return (
        PasswordResetGrant.objects.select_for_update()
        .select_related("user")
        .filter(token_digest=token_digest)
        .first()
    )


def consume_password_reset_grant(
    *,
    grant: PasswordResetGrant,
) -> PasswordResetGrant:
    grant.consumed_at = timezone.now()
    grant.save(update_fields=["consumed_at", "updated_at"])
    return grant
