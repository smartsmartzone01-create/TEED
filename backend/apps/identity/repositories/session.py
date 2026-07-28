from django.db.models import QuerySet
from django.utils import timezone

from ..models import User, UserSession


def create_user_session(
    *,
    user: User,
    expires_at,
    ip_address=None,
    device_id=None,
    user_agent_hash="",
) -> UserSession:
    return UserSession.objects.create(
        user=user,
        expires_at=expires_at,
        ip_address=ip_address,
        device_id=device_id,
        user_agent_hash=user_agent_hash,
    )


def get_user_session_for_update(*, session_id) -> UserSession | None:
    return (
        UserSession.objects.select_for_update()
        .select_related("user")
        .filter(id=session_id)
        .first()
    )


def update_session_refresh(
    *,
    session: UserSession,
    refresh_jti,
) -> UserSession:
    session.current_refresh_jti = refresh_jti
    session.last_seen_at = timezone.now()
    session.save(
        update_fields=[
            "current_refresh_jti",
            "last_seen_at",
            "updated_at",
        ]
    )
    return session


def revoke_session(
    *,
    session: UserSession,
    reason: str,
) -> UserSession:
    if session.revoked_at is None:
        session.revoked_at = timezone.now()
        session.revoke_reason = reason
        session.save(
            update_fields=[
                "revoked_at",
                "revoke_reason",
                "updated_at",
            ]
        )
    return session


def get_active_user_sessions_for_update(*, user: User) -> QuerySet:
    return UserSession.objects.select_for_update().filter(
        user=user,
        revoked_at__isnull=True,
        expires_at__gt=timezone.now(),
    )
