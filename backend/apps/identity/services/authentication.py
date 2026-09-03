from common.exceptions.modules.identity import (
    EmailVerificationRequired,
    InvalidCredentials,
    PhoneVerificationRequired,
)
from django.contrib.auth import authenticate

from ..models import IdentitySecurityEvent
from ..selectors import get_user_by_email, get_user_by_phone_number
from .security_event import record_identity_security_event
from .session import issue_token_pair


def authenticated_login_result(
    *,
    user,
    identifier,
    ip_address,
    user_agent,
    device_id,
):
    tokens = issue_token_pair(
        user=user,
        ip_address=ip_address,
        user_agent=user_agent,
        device_id=device_id,
    )
    record_identity_security_event(
        user=user,
        identifier=identifier,
        event_type=IdentitySecurityEvent.EventType.LOGIN_SUCCEEDED,
        outcome=IdentitySecurityEvent.Outcome.SUCCESS,
        session_id=tokens["session_id"],
        ip_address=ip_address,
        user_agent=user_agent,
        device_id=device_id,
    )
    return {
        "user": user,
        "tokens": tokens,
        "next_step": "dashboard" if user.is_onboarding_complete else "complete_onboarding",
    }


def login_email_user(
    *,
    email: str,
    password: str,
    ip_address=None,
    user_agent="",
    device_id=None,
) -> dict:
    normalized_email = email.strip().lower()
    user = authenticate(email=normalized_email, password=password)
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
            metadata={"reason": "invalid_credentials", "channel": "email"},
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
            metadata={"reason": "email_unverified", "channel": "email"},
        )
        raise EmailVerificationRequired()
    return authenticated_login_result(
        user=user,
        identifier=normalized_email,
        ip_address=ip_address,
        user_agent=user_agent,
        device_id=device_id,
    )


def login_phone_user(
    *,
    phone_number: str,
    password: str,
    ip_address=None,
    user_agent="",
    device_id=None,
) -> dict:
    user = get_user_by_phone_number(phone_number=phone_number)
    if user is None or not user.is_active or not user.check_password(password):
        record_identity_security_event(
            user=user,
            identifier=phone_number,
            event_type=IdentitySecurityEvent.EventType.LOGIN_FAILED,
            outcome=IdentitySecurityEvent.Outcome.FAILURE,
            ip_address=ip_address,
            user_agent=user_agent,
            device_id=device_id,
            metadata={"reason": "invalid_credentials", "channel": "phone"},
        )
        raise InvalidCredentials()
    if not user.is_phone_verified:
        record_identity_security_event(
            user=user,
            identifier=phone_number,
            event_type=IdentitySecurityEvent.EventType.LOGIN_FAILED,
            outcome=IdentitySecurityEvent.Outcome.BLOCKED,
            ip_address=ip_address,
            user_agent=user_agent,
            device_id=device_id,
            metadata={"reason": "phone_unverified", "channel": "phone"},
        )
        raise PhoneVerificationRequired()
    return authenticated_login_result(
        user=user,
        identifier=phone_number,
        ip_address=ip_address,
        user_agent=user_agent,
        device_id=device_id,
    )
