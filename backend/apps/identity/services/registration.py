from common.exceptions.modules.identity import (
    EmailAlreadyRegistered,
    PhoneNumberAlreadyRegistered,
)
from django.db import IntegrityError, transaction

from ..models import IdentitySecurityEvent, User
from ..repositories import create_user
from ..selectors import get_user_by_email, get_user_by_phone_number
from .email_verification import issue_email_verification_challenge
from .phone_verification import issue_phone_verification_challenge
from .security_event import record_identity_security_event


def register_email_user(
    *,
    email: str,
    password: str,
    ip_address=None,
    user_agent="",
    device_id=None,
) -> User:
    normalized_email = email.strip().lower()
    existing_user = get_user_by_email(email=normalized_email)
    if existing_user:
        record_identity_security_event(
            user=existing_user,
            identifier=normalized_email,
            event_type=IdentitySecurityEvent.EventType.REGISTRATION_FAILED,
            outcome=IdentitySecurityEvent.Outcome.BLOCKED,
            ip_address=ip_address,
            user_agent=user_agent,
            device_id=device_id,
            metadata={"reason": "email_already_registered", "channel": "email"},
        )
        raise EmailAlreadyRegistered()

    try:
        with transaction.atomic():
            user = create_user(email=normalized_email, password=password)
            issue_email_verification_challenge(
                user=user,
                ip_address=ip_address,
                user_agent=user_agent,
                device_id=device_id,
            )
            record_identity_security_event(
                user=user,
                identifier=normalized_email,
                event_type=IdentitySecurityEvent.EventType.REGISTRATION_SUCCEEDED,
                outcome=IdentitySecurityEvent.Outcome.SUCCESS,
                ip_address=ip_address,
                user_agent=user_agent,
                device_id=device_id,
                metadata={"channel": "email"},
            )
    except IntegrityError as exc:
        raise EmailAlreadyRegistered() from exc
    return user


def register_phone_user(
    *,
    phone_number: str,
    country_code: str,
    password: str,
    ip_address=None,
    user_agent="",
    device_id=None,
) -> User:
    existing_user = get_user_by_phone_number(phone_number=phone_number)
    if existing_user:
        record_identity_security_event(
            user=existing_user,
            identifier=phone_number,
            event_type=IdentitySecurityEvent.EventType.REGISTRATION_FAILED,
            outcome=IdentitySecurityEvent.Outcome.BLOCKED,
            ip_address=ip_address,
            user_agent=user_agent,
            device_id=device_id,
            metadata={"reason": "phone_already_registered", "channel": "phone"},
        )
        raise PhoneNumberAlreadyRegistered()

    try:
        with transaction.atomic():
            user = create_user(
                phone_number=phone_number,
                country_code=country_code,
                password=password,
            )
            issue_phone_verification_challenge(
                user=user,
                ip_address=ip_address,
                user_agent=user_agent,
                device_id=device_id,
            )
            record_identity_security_event(
                user=user,
                identifier=phone_number,
                event_type=IdentitySecurityEvent.EventType.REGISTRATION_SUCCEEDED,
                outcome=IdentitySecurityEvent.Outcome.SUCCESS,
                ip_address=ip_address,
                user_agent=user_agent,
                device_id=device_id,
                metadata={"channel": "phone"},
            )
    except IntegrityError as exc:
        raise PhoneNumberAlreadyRegistered() from exc
    return user
