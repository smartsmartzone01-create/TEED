from common.exceptions.modules.identity import (
    EmailAlreadyRegistered,
    EmailVerificationRequired,
)
from django.db import IntegrityError, transaction

from ..models import IdentitySecurityEvent, User
from ..repositories import create_user
from ..selectors import get_user_by_email
from .email_verification import (
    issue_email_verification_challenge,
)
from .security_event import record_identity_security_event


def register_email_user(
    *,
    email: str,
    password: str,
    ip_address=None,
    user_agent="",
    device_id=None,
) -> User:
    """
    Register a user with email and password, then issue
    the initial email-verification challenge.
    """

    normalized_email = email.strip().lower()

    existing_user = get_user_by_email(email=normalized_email)
    if existing_user:
        if (
            existing_user.is_active
            and not existing_user.is_email_verified
            and existing_user.check_password(password)
        ):
            record_identity_security_event(
                user=existing_user,
                identifier=normalized_email,
                event_type=IdentitySecurityEvent.EventType.REGISTRATION_FAILED,
                outcome=IdentitySecurityEvent.Outcome.BLOCKED,
                ip_address=ip_address,
                user_agent=user_agent,
                device_id=device_id,
                metadata={"reason": "email_verification_required"},
            )
            raise EmailVerificationRequired()

        record_identity_security_event(
            user=existing_user,
            identifier=normalized_email,
            event_type=IdentitySecurityEvent.EventType.REGISTRATION_FAILED,
            outcome=IdentitySecurityEvent.Outcome.BLOCKED,
            ip_address=ip_address,
            user_agent=user_agent,
            device_id=device_id,
            metadata={"reason": "email_already_registered"},
        )
        raise EmailAlreadyRegistered()

    try:
        with transaction.atomic():
            user = create_user(
                email=normalized_email,
                password=password,
            )

            issue_email_verification_challenge(
                user=user,
                ip_address=ip_address,
                user_agent=user_agent,
                device_id=device_id,
            )
            record_identity_security_event(
                user=user,
                identifier=normalized_email,
                event_type=(IdentitySecurityEvent.EventType.REGISTRATION_SUCCEEDED),
                outcome=IdentitySecurityEvent.Outcome.SUCCESS,
                ip_address=ip_address,
                user_agent=user_agent,
                device_id=device_id,
            )

    except IntegrityError as exc:
        raise EmailAlreadyRegistered() from exc

    return user
