from django.db import IntegrityError, transaction

from common.exceptions.modules.identity import (
    IdentityVerificationRequired,
    OnboardingAlreadyCompleted,
    PhoneNumberAlreadyRegistered,
    UsernameAlreadyTaken,
)

from ..models import User
from ..repositories import complete_user_onboarding
from ..selectors import (
    get_user_by_phone_number,
    get_user_by_username,
)


def complete_onboarding(
    *,
    user: User,
    username: str,
    phone_number: str,
    country_code: str,
) -> User:
    """
    Complete the required onboarding identity fields.
    """

    user.refresh_from_db()

    if user.is_onboarding_complete:
        raise OnboardingAlreadyCompleted()

    if not (
        user.is_email_verified
        or user.is_phone_verified
    ):
        raise IdentityVerificationRequired()

    if get_user_by_username(
        username=username,
    ):
        raise UsernameAlreadyTaken()

    if get_user_by_phone_number(
        phone_number=phone_number,
    ):
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
        if get_user_by_username(
            username=username,
        ):
            raise UsernameAlreadyTaken() from exc

        if get_user_by_phone_number(
            phone_number=phone_number,
        ):
            raise (
                PhoneNumberAlreadyRegistered()
            ) from exc

        raise