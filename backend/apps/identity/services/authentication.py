from common.exceptions.modules.identity import (
    EmailVerificationRequired,
    InvalidCredentials,
)
from django.contrib.auth import authenticate

from .token import issue_token_pair


def login_email_user(
    *,
    email: str,
    password: str,
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
        raise InvalidCredentials()

    if not user.is_email_verified:
        raise EmailVerificationRequired()

    tokens = issue_token_pair(
        user=user,
    )

    next_step = "dashboard" if user.is_onboarding_complete else "complete_onboarding"

    return {
        "user": user,
        "tokens": tokens,
        "next_step": next_step,
    }
