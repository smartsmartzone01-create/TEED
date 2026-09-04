from common.exceptions.modules.identity import EmailAlreadyRegistered
from django.db import IntegrityError, transaction

from ..models import EmailVerificationChallenge, PhoneVerificationChallenge, User
from ..repositories import set_user_email
from ..selectors import get_user_by_email, has_external_identity
from .email_verification import (
    issue_email_verification_challenge,
    verify_email_verification_code,
)
from .phone_verification import (
    issue_phone_verification_challenge,
    verify_phone_verification_code,
)


def get_account_protection_recommendation(*, user: User) -> str | None:
    if not user.is_onboarding_complete:
        return None

    if user.phone_number and not user.is_phone_verified:
        return "verify_phone"

    if (
        user.is_phone_verified
        and not user.is_email_verified
        and not has_external_identity(user=user)
    ):
        return "verify_email" if user.email else "add_email"

    return None


def request_phone_account_protection(
    *,
    user: User,
    ip_address=None,
    user_agent="",
    device_id=None,
) -> User:
    user.refresh_from_db()
    if not user.phone_number:
        raise ValueError("phone_missing")
    if user.is_phone_verified:
        raise ValueError("phone_already_verified")

    issue_phone_verification_challenge(
        user=user,
        purpose=PhoneVerificationChallenge.Purpose.ACCOUNT_PROTECTION,
        enforce_resend_limits=True,
        ip_address=ip_address,
        user_agent=user_agent,
        device_id=device_id,
    )
    return user


def verify_phone_account_protection(
    *,
    user: User,
    code: str,
    ip_address=None,
    user_agent="",
    device_id=None,
) -> User:
    user.refresh_from_db()
    if not user.phone_number:
        raise ValueError("phone_missing")

    return verify_phone_verification_code(
        user=user,
        code=code,
        purpose=PhoneVerificationChallenge.Purpose.ACCOUNT_PROTECTION,
        ip_address=ip_address,
        user_agent=user_agent,
        device_id=device_id,
    )


def request_email_account_protection(
    *,
    user: User,
    email: str | None = None,
    ip_address=None,
    user_agent="",
    device_id=None,
) -> User:
    user.refresh_from_db()
    normalized_email = (email or "").strip().lower()

    if user.is_email_verified:
        raise ValueError("email_already_verified")

    if user.email:
        if normalized_email and user.email.casefold() != normalized_email.casefold():
            raise ValueError("email_change_not_allowed")
    else:
        if not normalized_email:
            raise ValueError("email_required")
        owner = get_user_by_email(email=normalized_email)
        if owner is not None and owner.id != user.id:
            raise EmailAlreadyRegistered()

        try:
            with transaction.atomic():
                locked_user = User.objects.select_for_update().get(pk=user.pk)
                if locked_user.email:
                    if locked_user.email.casefold() != normalized_email.casefold():
                        raise ValueError("email_change_not_allowed")
                else:
                    set_user_email(user=locked_user, email=normalized_email)
                user = locked_user
        except IntegrityError as exc:
            raise EmailAlreadyRegistered() from exc

    issue_email_verification_challenge(
        user=user,
        purpose=EmailVerificationChallenge.Purpose.ACCOUNT_PROTECTION,
        enforce_resend_limits=True,
        ip_address=ip_address,
        user_agent=user_agent,
        device_id=device_id,
    )
    user.refresh_from_db()
    return user


def verify_email_account_protection(
    *,
    user: User,
    code: str,
    ip_address=None,
    user_agent="",
    device_id=None,
) -> User:
    user.refresh_from_db()
    if not user.email:
        raise ValueError("email_missing")

    return verify_email_verification_code(
        user=user,
        code=code,
        purpose=EmailVerificationChallenge.Purpose.ACCOUNT_PROTECTION,
        ip_address=ip_address,
        user_agent=user_agent,
        device_id=device_id,
    )
