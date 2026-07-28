from datetime import datetime
from datetime import timezone as datetime_timezone
from uuid import UUID

from common.exceptions.modules.identity import RefreshTokenInvalid
from django.utils import timezone
from rest_framework_simplejwt.exceptions import TokenError
from rest_framework_simplejwt.token_blacklist.models import (
    BlacklistedToken,
    OutstandingToken,
)
from rest_framework_simplejwt.tokens import RefreshToken, UntypedToken

from ..models import User, UserSession


def build_session_token_pair(
    *,
    user: User,
    session: UserSession,
) -> dict:
    """Issue an access/refresh pair bound to a server-side session."""

    refresh = RefreshToken.for_user(user)
    refresh["session_id"] = str(session.id)
    refresh["session_family_id"] = str(session.family_id)

    remaining_lifetime = session.expires_at - timezone.now()
    refresh.set_exp(lifetime=remaining_lifetime)

    OutstandingToken.objects.filter(
        jti=refresh["jti"],
    ).update(
        token=str(refresh),
        expires_at=session.expires_at,
    )

    access = refresh.access_token
    return {
        "access": str(access),
        "refresh": str(refresh),
        "token_type": "Bearer",
        "access_expires_at": datetime.fromtimestamp(
            access["exp"],
            tz=datetime_timezone.utc,
        ),
        "refresh_expires_at": session.expires_at,
        "session_id": str(session.id),
        "refresh_jti": UUID(refresh["jti"]),
    }


def decode_refresh_token(raw_token: str) -> dict:
    """Verify refresh JWT integrity/expiry without applying blacklist state."""

    if not raw_token:
        raise RefreshTokenInvalid()

    try:
        token = UntypedToken(raw_token)
        if token.get("token_type") != "refresh":
            raise RefreshTokenInvalid()
        return {
            "session_id": UUID(token["session_id"]),
            "user_id": str(token["user_id"]),
            "jti": UUID(token["jti"]),
        }
    except (KeyError, TypeError, ValueError, TokenError) as exc:
        raise RefreshTokenInvalid() from exc


def blacklist_refresh_token(raw_token: str) -> None:
    try:
        RefreshToken(raw_token).blacklist()
    except TokenError:
        return


def blacklist_outstanding_refresh(*, refresh_jti) -> None:
    normalized_jti = (
        refresh_jti.hex
        if isinstance(refresh_jti, UUID)
        else str(refresh_jti).replace("-", "")
    )
    outstanding = OutstandingToken.objects.filter(
        jti=normalized_jti,
    ).first()
    if outstanding is not None:
        BlacklistedToken.objects.get_or_create(
            token=outstanding,
        )
