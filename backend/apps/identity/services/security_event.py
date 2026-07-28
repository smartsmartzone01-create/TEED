from hashlib import sha256

from ..models import IdentitySecurityEvent, User
from ..repositories import create_identity_security_event


def hash_user_agent(user_agent: str) -> str:
    if not user_agent:
        return ""
    return sha256(user_agent.encode("utf-8")).hexdigest()


def record_identity_security_event(
    *,
    user: User,
    event_type: str,
    outcome: str,
    challenge_id=None,
    ip_address=None,
    user_agent="",
    metadata=None,
) -> IdentitySecurityEvent:
    return create_identity_security_event(
        user=user,
        event_type=event_type,
        outcome=outcome,
        challenge_id=challenge_id,
        ip_address=ip_address,
        user_agent_hash=hash_user_agent(user_agent),
        metadata=metadata,
    )
