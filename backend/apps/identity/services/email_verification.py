import secrets
import string
from datetime import timedelta

from django.conf import settings
from django.contrib.auth.hashers import (
    check_password,
    make_password,
)
from django.core.mail import send_mail
from django.db import transaction
from django.utils import timezone

from common.exceptions.modules.identity import (
    EmailVerificationAttemptLimitReached,
    EmailVerificationChallengeNotFound,
    EmailVerificationCodeExpired,
    EmailVerificationCodeInvalid,
)

from ..models import (
    EmailVerificationChallenge,
    User,
)
from ..repositories import (
    consume_email_verification_challenge,
    create_email_verification_challenge,
    increment_email_verification_attempt,
    invalidate_outstanding_email_verification_challenges,
    mark_user_email_verified,
)
from ..selectors import (
    get_latest_email_verification_challenge,
)



def _generate_verification_code() -> str:
    """
    Generate a cryptographically secure numeric code.
    """

    code_length = (
        settings.EMAIL_VERIFICATION_CODE_LENGTH
    )

    return "".join(
        secrets.choice(string.digits)
        for _ in range(code_length)
    )


@transaction.atomic
def issue_email_verification_challenge(
    *,
    user: User,
    purpose: str = (
        EmailVerificationChallenge.Purpose.REGISTRATION
    ),
) -> EmailVerificationChallenge:
    """
    Generate, store, and deliver an email-verification
    challenge.

    The plaintext code is delivered by email and is
    never persisted or returned.
    """

    if not user.email:
        raise ValueError(
            "An email address is required for "
            "email verification."
        )

    code = _generate_verification_code()

    invalidate_outstanding_email_verification_challenges(
        user=user,
        purpose=purpose,
    )

    challenge = create_email_verification_challenge(
        user=user,
        purpose=purpose,
        code_digest=make_password(code),
        expires_at=(
            timezone.now()
            + timedelta(
                minutes=(
                    settings.EMAIL_VERIFICATION_TTL_MINUTES
                )
            )
        ),
        max_attempts=(
            settings.EMAIL_VERIFICATION_MAX_ATTEMPTS
        ),
    )

    send_mail(
        subject="Verify your TEED email",
        message=(
            f"Your TEED verification code is {code}.\n\n"
            "This code expires in "
            f"{settings.EMAIL_VERIFICATION_TTL_MINUTES} "
            "minutes."
        ),
        from_email=settings.DEFAULT_FROM_EMAIL,
        recipient_list=[user.email],
        fail_silently=False,
    )

    return challenge


def verify_email_verification_code(
    *,
    user: User,
    code: str,
    purpose: str = (
        EmailVerificationChallenge.Purpose.REGISTRATION
    ),
) -> User:
    """
    Verify a submitted code and mark the user's email
    address as verified.
    """


    challenge = (
        get_latest_email_verification_challenge(
            user=user,
            purpose=purpose,
        )
    )

    if challenge is None:
        raise EmailVerificationChallengeNotFound()

    if challenge.is_expired:
        raise EmailVerificationCodeExpired()

    if (
        challenge.attempt_count
        >= challenge.max_attempts
    ):
        raise EmailVerificationAttemptLimitReached()

    if not check_password(
        code.strip(),
        challenge.code_digest,
    ):
        challenge = (
            increment_email_verification_attempt(
                challenge=challenge,
            )
        )

        if (
            challenge.attempt_count
            >= challenge.max_attempts
        ):
            raise (
                EmailVerificationAttemptLimitReached()
            )

        raise EmailVerificationCodeInvalid()

    with transaction.atomic():
        consume_email_verification_challenge(
            challenge=challenge,
        )
        mark_user_email_verified(
            user=user,
        )

    return user