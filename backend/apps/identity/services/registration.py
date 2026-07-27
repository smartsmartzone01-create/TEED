from django.db import IntegrityError, transaction

from common.exceptions.modules.identity import (
    EmailAlreadyRegistered,
)

from ..models import User
from ..repositories import create_user
from ..selectors import get_user_by_email
from .email_verification import (
    issue_email_verification_challenge,
)


def register_email_user(
    *,
    email: str,
    password: str,
) -> User:
    """
    Register a user with email and password, then issue
    the initial email-verification challenge.
    """

    normalized_email = email.strip().lower()

    if get_user_by_email(
        email=normalized_email,
    ):
        raise EmailAlreadyRegistered()

    try:
        with transaction.atomic():
            user = create_user(
                email=normalized_email,
                password=password,
            )

            issue_email_verification_challenge(
                user=user,
            )

    except IntegrityError as exc:
        raise EmailAlreadyRegistered() from exc

    return user