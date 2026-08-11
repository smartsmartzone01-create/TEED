from django.db import transaction
from django.utils import timezone

from apps.identity.models import IdentitySecurityEvent, UserSession
from apps.identity.repositories import revoke_session
from apps.identity.services import record_identity_security_event
from apps.identity.services.token import blacklist_outstanding_refresh


def _revoke(session, reason):
    revoke_session(session=session, reason=reason)
    if session.current_refresh_jti:
        blacklist_outstanding_refresh(refresh_jti=session.current_refresh_jti)


@transaction.atomic
def change_password(*, user, current_session_id, new_password, audit_metadata):
    user.set_password(new_password)
    user.save(update_fields=["password", "updated_at"])
    others = list(
        UserSession.objects.select_for_update()
        .filter(user=user, revoked_at__isnull=True, expires_at__gt=timezone.now())
        .exclude(id=current_session_id)
    )
    for session in others:
        _revoke(session, UserSession.RevokeReason.PASSWORD_CHANGE)
    record_identity_security_event(
        user=user,
        event_type=IdentitySecurityEvent.EventType.PASSWORD_CHANGED,
        outcome=IdentitySecurityEvent.Outcome.SUCCESS,
        session_id=current_session_id,
        **audit_metadata,
        metadata={"revoked_other_sessions": len(others)},
    )
    return len(others)


@transaction.atomic
def revoke_owned_session(*, user, session_id, current_session_id, audit_metadata):
    if str(session_id) == str(current_session_id):
        raise ValueError("current_session")
    session = (
        UserSession.objects.select_for_update().filter(user=user, id=session_id).first()
    )
    if session is None:
        return False
    _revoke(session, UserSession.RevokeReason.USER_REVOKED)
    record_identity_security_event(
        user=user,
        event_type=IdentitySecurityEvent.EventType.SESSION_REVOKED,
        outcome=IdentitySecurityEvent.Outcome.SUCCESS,
        session_id=session.id,
        **audit_metadata,
    )
    return True


@transaction.atomic
def revoke_other_sessions(*, user, current_session_id, audit_metadata):
    sessions = list(
        UserSession.objects.select_for_update()
        .filter(user=user, revoked_at__isnull=True, expires_at__gt=timezone.now())
        .exclude(id=current_session_id)
    )
    for session in sessions:
        _revoke(session, UserSession.RevokeReason.USER_REVOKED)
    record_identity_security_event(
        user=user,
        event_type=IdentitySecurityEvent.EventType.OTHER_SESSIONS_REVOKED,
        outcome=IdentitySecurityEvent.Outcome.SUCCESS,
        session_id=current_session_id,
        metadata={"revoked_sessions": len(sessions)},
        **audit_metadata,
    )
    return len(sessions)
