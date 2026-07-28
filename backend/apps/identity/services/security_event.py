from datetime import timedelta
from hashlib import sha256

from django.conf import settings
from django.utils import timezone

from ..models import IdentitySecurityEvent, User
from ..repositories import create_identity_security_event


def hash_user_agent(user_agent: str) -> str:
    if not user_agent:
        return ""
    return sha256(user_agent.encode("utf-8")).hexdigest()


def hash_identity_identifier(identifier: str) -> str:
    """Create a non-reversible correlation key for email/phone attempts."""
    normalized = identifier.strip().casefold()
    if not normalized:
        return ""
    value = f"{settings.SECRET_KEY}:{normalized}"
    return sha256(value.encode("utf-8")).hexdigest()


def record_identity_security_event(
    *,
    user: User | None = None,
    event_type: str,
    outcome: str,
    challenge_id=None,
    session_id=None,
    device_id=None,
    identifier="",
    ip_address=None,
    user_agent="",
    metadata=None,
) -> IdentitySecurityEvent:
    safe_metadata = {
        key: value
        for key, value in (metadata or {}).items()
        if key
        not in {
            "password",
            "code",
            "token",
            "authorization",
            "cookie",
            "reset_grant",
        }
    }
    return create_identity_security_event(
        user=user,
        event_type=event_type,
        outcome=outcome,
        challenge_id=challenge_id,
        session_id=session_id,
        device_id=device_id,
        identifier_hash=hash_identity_identifier(identifier),
        ip_address=ip_address,
        user_agent_hash=hash_user_agent(user_agent),
        metadata=safe_metadata,
        expires_at=(
            timezone.now()
            + timedelta(days=settings.IDENTITY_SECURITY_EVENT_RETENTION_DAYS)
        ),
    )
