from common.exceptions.modules.identity import (
    IdentityVerificationRequired,
    OnboardingAlreadyCompleted,
    PhoneNumberAlreadyRegistered,
    UsernameAlreadyTaken,
    VerifiedPhoneChangeNotAllowed,
)
from django.db import IntegrityError, transaction

from ..models import User
from ..repositories import complete_user_onboarding
from ..selectors import get_user_by_phone_number, get_user_by_username


def complete_onboarding(
    *,
    user: User,
    username: str,
    phone_number: str,
    country_code: str,
) -> User:
    user.refresh_from_db()
    if user.is_onboarding_complete:
        raise OnboardingAlreadyCompleted()
    if not (user.is_email_verified or user.is_phone_verified):
        raise IdentityVerificationRequired()

    username_owner = get_user_by_username(username=username)
    if username_owner and username_owner.id != user.id:
        raise UsernameAlreadyTaken()

    if (
        user.is_phone_verified
        and user.phone_number
        and phone_number != user.phone_number
    ):
        raise VerifiedPhoneChangeNotAllowed()

    phone_owner = get_user_by_phone_number(phone_number=phone_number)
    if phone_owner and phone_owner.id != user.id:
        raise PhoneNumberAlreadyRegistered()

    try:
        with transaction.atomic():
            return complete_user_onboarding(
                user=user,
                username=username,
                phone_number=phone_number,
                country_code=country_code,
            )
    except IntegrityError as exc:
        username_owner = get_user_by_username(username=username)
        if username_owner and username_owner.id != user.id:
            raise UsernameAlreadyTaken() from exc
        phone_owner = get_user_by_phone_number(phone_number=phone_number)
        if phone_owner and phone_owner.id != user.id:
            raise PhoneNumberAlreadyRegistered() from exc
        raise
