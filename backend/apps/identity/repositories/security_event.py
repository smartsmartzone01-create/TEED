from ..models import IdentitySecurityEvent


def create_identity_security_event(
    *,
    user=None,
    event_type: str,
    outcome: str,
    challenge_id=None,
    session_id=None,
    device_id=None,
    identifier_hash="",
    ip_address=None,
    user_agent_hash="",
    metadata=None,
    expires_at,
) -> IdentitySecurityEvent:
    return IdentitySecurityEvent.objects.create(
        user=user,
        event_type=event_type,
        outcome=outcome,
        challenge_id=challenge_id,
        session_id=session_id,
        device_id=device_id,
        identifier_hash=identifier_hash,
        ip_address=ip_address,
        user_agent_hash=user_agent_hash,
        metadata=metadata or {},
        expires_at=expires_at,
    )
