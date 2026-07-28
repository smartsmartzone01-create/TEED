from common.exceptions.modules.identity import (
    EmailVerificationRequired,
    InvalidCredentials,
)
from django.contrib.auth import authenticate

from ..models import IdentitySecurityEvent
from ..selectors import get_user_by_email
from .security_event import record_identity_security_event
from .session import issue_token_pair


def login_email_user(
    *,
    email: str,
    password: str,
    ip_address=None,
    user_agent="",
    device_id=None,
) -> dict:
    """
    Authenticate an email user and issue JWT tokens.
    """

    normalized_email = email.strip().lower()

    user = authenticate(
        email=normalized_email,
        password=password,
    )

    if user is None or not user.is_active:
        known_user = get_user_by_email(email=normalized_email)
        record_identity_security_event(
            user=known_user,
            identifier=normalized_email,
            event_type=IdentitySecurityEvent.EventType.LOGIN_FAILED,
            outcome=IdentitySecurityEvent.Outcome.FAILURE,
            ip_address=ip_address,
            user_agent=user_agent,
            device_id=device_id,
            metadata={"reason": "invalid_credentials"},
        )
        raise InvalidCredentials()

    if not user.is_email_verified:
        record_identity_security_event(
            user=user,
            identifier=normalized_email,
            event_type=IdentitySecurityEvent.EventType.LOGIN_FAILED,
            outcome=IdentitySecurityEvent.Outcome.BLOCKED,
            ip_address=ip_address,
            user_agent=user_agent,
            device_id=device_id,
            metadata={"reason": "email_unverified"},
        )
        raise EmailVerificationRequired()

    tokens = issue_token_pair(
        user=user,
        ip_address=ip_address,
        user_agent=user_agent,
        device_id=device_id,
    )
    record_identity_security_event(
        user=user,
        identifier=normalized_email,
        event_type=IdentitySecurityEvent.EventType.LOGIN_SUCCEEDED,
        outcome=IdentitySecurityEvent.Outcome.SUCCESS,
        session_id=tokens["session_id"],
        ip_address=ip_address,
        user_agent=user_agent,
        device_id=device_id,
    )

    next_step = "dashboard" if user.is_onboarding_complete else "complete_onboarding"

    return {
        "user": user,
        "tokens": tokens,
        "next_step": next_step,
    }
