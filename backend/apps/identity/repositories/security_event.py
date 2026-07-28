from ..models import IdentitySecurityEvent, User


def create_identity_security_event(
    *,
    user: User,
    event_type: str,
    outcome: str,
    challenge_id=None,
    ip_address=None,
    user_agent_hash="",
    metadata=None,
) -> IdentitySecurityEvent:
    return IdentitySecurityEvent.objects.create(
        user=user,
        event_type=event_type,
        outcome=outcome,
        challenge_id=challenge_id,
        ip_address=ip_address,
        user_agent_hash=user_agent_hash,
        metadata=metadata or {},
    )
