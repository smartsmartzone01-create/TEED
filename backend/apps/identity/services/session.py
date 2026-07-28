from hashlib import sha256

from common.exceptions.modules.identity import (
    RefreshTokenInvalid,
    RefreshTokenReuseDetected,
    SessionExpired,
    SessionInvalid,
)
from django.conf import settings
from django.db import transaction
from django.utils import timezone
from rest_framework_simplejwt.exceptions import TokenError
from rest_framework_simplejwt.tokens import RefreshToken

from ..models import User, UserSession
from ..repositories import (
    create_user_session,
    get_active_user_sessions_for_update,
    get_user_session_for_update,
    revoke_session,
    update_session_refresh,
)
from .token import (
    blacklist_outstanding_refresh,
    blacklist_refresh_token,
    build_session_token_pair,
    decode_refresh_token,
)


def _hash_user_agent(user_agent: str) -> str:
    if not user_agent:
        return ""
    return sha256(user_agent.encode("utf-8")).hexdigest()


@transaction.atomic
def issue_token_pair(
    *,
    user: User,
    ip_address=None,
    user_agent="",
    device_id=None,
) -> dict:
    """Create a server-side session and its initial rotating token pair."""

    if not user.is_active:
        raise ValueError("Inactive users cannot receive tokens.")

    session = create_user_session(
        user=user,
        expires_at=(timezone.now() + settings.SIMPLE_JWT["REFRESH_TOKEN_LIFETIME"]),
        ip_address=ip_address,
        device_id=device_id,
        user_agent_hash=_hash_user_agent(user_agent),
    )
    tokens = build_session_token_pair(
        user=user,
        session=session,
    )
    update_session_refresh(
        session=session,
        refresh_jti=tokens["refresh_jti"],
    )
    return tokens


def _revoke_for_security(
    *,
    session: UserSession,
    reason: str,
) -> None:
    revoke_session(
        session=session,
        reason=reason,
    )
    if session.current_refresh_jti is not None:
        blacklist_outstanding_refresh(
            refresh_jti=session.current_refresh_jti,
        )


def rotate_refresh_token(*, raw_refresh_token: str) -> dict:
    """Rotate a refresh token or revoke its family when reuse is detected."""

    claims = decode_refresh_token(raw_refresh_token)
    pending_exception = None
    result = None

    with transaction.atomic():
        session = get_user_session_for_update(
            session_id=claims["session_id"],
        )
        if session is None or str(session.user_id) != claims["user_id"]:
            raise SessionInvalid()

        if session.revoked_at is not None:
            raise SessionInvalid()

        if session.expires_at <= timezone.now():
            _revoke_for_security(
                session=session,
                reason=UserSession.RevokeReason.EXPIRED,
            )
            pending_exception = SessionExpired()
        elif not session.user.is_active:
            _revoke_for_security(
                session=session,
                reason=UserSession.RevokeReason.USER_INACTIVE,
            )
            pending_exception = SessionInvalid()
        elif session.current_refresh_jti != claims["jti"]:
            _revoke_for_security(
                session=session,
                reason=UserSession.RevokeReason.REFRESH_REUSE,
            )
            pending_exception = RefreshTokenReuseDetected()
        else:
            try:
                RefreshToken(raw_refresh_token)
            except TokenError:
                _revoke_for_security(
                    session=session,
                    reason=UserSession.RevokeReason.REFRESH_REUSE,
                )
                pending_exception = RefreshTokenReuseDetected()
            else:
                blacklist_refresh_token(raw_refresh_token)
                tokens = build_session_token_pair(
                    user=session.user,
                    session=session,
                )
                update_session_refresh(
                    session=session,
                    refresh_jti=tokens["refresh_jti"],
                )
                result = {
                    **tokens,
                    "user": session.user,
                }

    if pending_exception is not None:
        raise pending_exception
    return result


@transaction.atomic
def revoke_refresh_session(
    *,
    raw_refresh_token: str,
    reason=UserSession.RevokeReason.LOGOUT,
) -> None:
    try:
        claims = decode_refresh_token(raw_refresh_token)
    except RefreshTokenInvalid:
        return

    session = get_user_session_for_update(
        session_id=claims["session_id"],
    )
    if session is None:
        return

    revoke_session(
        session=session,
        reason=reason,
    )
    blacklist_refresh_token(raw_refresh_token)
    if session.current_refresh_jti is not None:
        blacklist_outstanding_refresh(
            refresh_jti=session.current_refresh_jti,
        )


@transaction.atomic
def revoke_all_user_sessions(
    *,
    user: User,
    reason=UserSession.RevokeReason.LOGOUT_ALL,
) -> int:
    sessions = list(
        get_active_user_sessions_for_update(
            user=user,
        )
    )
    for session in sessions:
        revoke_session(
            session=session,
            reason=reason,
        )
        if session.current_refresh_jti is not None:
            blacklist_outstanding_refresh(
                refresh_jti=session.current_refresh_jti,
            )
    return len(sessions)
