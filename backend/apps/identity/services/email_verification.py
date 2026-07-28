import logging
import secrets
import string
from datetime import timedelta

from common.exceptions.modules.identity import (
    EmailVerificationAttemptLimitReached,
    EmailVerificationChallengeNotFound,
    EmailVerificationCodeExpired,
    EmailVerificationCodeInvalid,
    EmailVerificationDailyLimitReached,
    EmailVerificationResendCooldown,
)
from django.conf import settings
from django.contrib.auth.hashers import (
    check_password,
    make_password,
)
from django.core.mail import send_mail
from django.db import transaction
from django.utils import timezone

from ..models import (
    EmailVerificationChallenge,
    IdentitySecurityEvent,
    User,
)
from ..repositories import (
    consume_email_verification_challenge,
    count_email_challenges_since,
    create_email_verification_challenge,
    get_email_verification_challenge_for_update,
    get_latest_email_challenge_including_invalidated,
    increment_email_verification_attempt,
    invalidate_outstanding_email_verification_challenges,
    mark_user_email_verified,
)
from .security_event import record_identity_security_event

logger = logging.getLogger("teed")


def _generate_verification_code() -> str:
    code_length = settings.EMAIL_VERIFICATION_CODE_LENGTH
    return "".join(secrets.choice(string.digits) for _ in range(code_length))


def _record_verification_event(
    *,
    user,
    event_type,
    outcome,
    challenge=None,
    ip_address=None,
    user_agent="",
    reason=None,
):
    metadata = {}
    if reason:
        metadata["reason"] = reason
    if challenge is not None:
        metadata["purpose"] = challenge.purpose

    return record_identity_security_event(
        user=user,
        event_type=event_type,
        outcome=outcome,
        challenge_id=(challenge.id if challenge is not None else None),
        ip_address=ip_address,
        user_agent=user_agent,
        metadata=metadata,
    )


def _deliver_verification_email(
    *,
    user,
    challenge,
    code,
    ip_address=None,
    user_agent="",
):
    try:
        send_mail(
            subject="Verify your TEED email",
            message=(
                f"Your TEED verification code is {code}.\n\n"
                "This code expires in "
                f"{settings.EMAIL_VERIFICATION_TTL_MINUTES} minutes."
            ),
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[user.email],
            fail_silently=False,
        )
    except Exception:
        try:
            _record_verification_event(
                user=user,
                event_type=(IdentitySecurityEvent.EventType.EMAIL_DELIVERY_FAILED),
                outcome=IdentitySecurityEvent.Outcome.FAILURE,
                challenge=challenge,
                ip_address=ip_address,
                user_agent=user_agent,
                reason="provider_error",
            )
        except Exception:
            logger.exception(
                "Email delivery failure event could not be recorded.",
                extra={"challenge_id": str(challenge.id)},
            )
        logger.exception(
            "Email verification delivery failed.",
            extra={
                "user_id": str(user.id),
                "challenge_id": str(challenge.id),
            },
        )
    else:
        try:
            _record_verification_event(
                user=user,
                event_type=(IdentitySecurityEvent.EventType.EMAIL_DELIVERY_SUCCEEDED),
                outcome=IdentitySecurityEvent.Outcome.SUCCESS,
                challenge=challenge,
                ip_address=ip_address,
                user_agent=user_agent,
            )
        except Exception:
            logger.exception(
                "Email delivery success event could not be recorded.",
                extra={"challenge_id": str(challenge.id)},
            )


def issue_email_verification_challenge(
    *,
    user: User,
    purpose: str = (EmailVerificationChallenge.Purpose.REGISTRATION),
    enforce_resend_limits=False,
    ip_address=None,
    user_agent="",
) -> EmailVerificationChallenge:
    """Persist a challenge atomically and deliver it only after commit."""

    if not user.email:
        raise ValueError("An email address is required for email verification.")

    pending_exception = None
    challenge = None
    code = None

    with transaction.atomic():
        locked_user = User.objects.select_for_update().get(pk=user.pk)
        now = timezone.now()

        if enforce_resend_limits:
            latest = get_latest_email_challenge_including_invalidated(
                user=locked_user,
                purpose=purpose,
            )
            cooldown = timedelta(
                seconds=settings.EMAIL_VERIFICATION_RESEND_COOLDOWN_SECONDS,
            )
            daily_count = count_email_challenges_since(
                user=locked_user,
                purpose=purpose,
                since=(now - timedelta(hours=24)),
            )

            if latest is not None and latest.created_at > now - cooldown:
                _record_verification_event(
                    user=locked_user,
                    event_type=(IdentitySecurityEvent.EventType.EMAIL_RESEND_BLOCKED),
                    outcome=IdentitySecurityEvent.Outcome.BLOCKED,
                    challenge=latest,
                    ip_address=ip_address,
                    user_agent=user_agent,
                    reason="cooldown",
                )
                pending_exception = EmailVerificationResendCooldown()
            elif daily_count >= settings.EMAIL_VERIFICATION_DAILY_LIMIT:
                _record_verification_event(
                    user=locked_user,
                    event_type=(IdentitySecurityEvent.EventType.EMAIL_RESEND_BLOCKED),
                    outcome=IdentitySecurityEvent.Outcome.BLOCKED,
                    challenge=latest,
                    ip_address=ip_address,
                    user_agent=user_agent,
                    reason="daily_limit",
                )
                pending_exception = EmailVerificationDailyLimitReached()

        if pending_exception is None:
            code = _generate_verification_code()
            invalidate_outstanding_email_verification_challenges(
                user=locked_user,
                purpose=purpose,
            )
            challenge = create_email_verification_challenge(
                user=locked_user,
                purpose=purpose,
                code_digest=make_password(code),
                expires_at=(
                    now
                    + timedelta(
                        minutes=settings.EMAIL_VERIFICATION_TTL_MINUTES,
                    )
                ),
                max_attempts=settings.EMAIL_VERIFICATION_MAX_ATTEMPTS,
            )
            _record_verification_event(
                user=locked_user,
                event_type=(IdentitySecurityEvent.EventType.EMAIL_CHALLENGE_ISSUED),
                outcome=IdentitySecurityEvent.Outcome.SUCCESS,
                challenge=challenge,
                ip_address=ip_address,
                user_agent=user_agent,
            )
            transaction.on_commit(
                lambda: _deliver_verification_email(
                    user=locked_user,
                    challenge=challenge,
                    code=code,
                    ip_address=ip_address,
                    user_agent=user_agent,
                )
            )

    if pending_exception is not None:
        raise pending_exception
    return challenge


def verify_email_verification_code(
    *,
    user: User,
    code: str,
    purpose: str = (EmailVerificationChallenge.Purpose.REGISTRATION),
    ip_address=None,
    user_agent="",
) -> User:
    """Lock, validate, and consume exactly one challenge atomically."""

    pending_exception = None

    with transaction.atomic():
        locked_user = User.objects.select_for_update().get(pk=user.pk)
        challenge = get_email_verification_challenge_for_update(
            user=locked_user,
            purpose=purpose,
        )

        if challenge is None:
            _record_verification_event(
                user=locked_user,
                event_type=(IdentitySecurityEvent.EventType.EMAIL_VERIFICATION_FAILED),
                outcome=IdentitySecurityEvent.Outcome.FAILURE,
                ip_address=ip_address,
                user_agent=user_agent,
                reason="challenge_not_found",
            )
            pending_exception = EmailVerificationChallengeNotFound()
        elif challenge.is_expired:
            _record_verification_event(
                user=locked_user,
                event_type=(IdentitySecurityEvent.EventType.EMAIL_VERIFICATION_FAILED),
                outcome=IdentitySecurityEvent.Outcome.FAILURE,
                challenge=challenge,
                ip_address=ip_address,
                user_agent=user_agent,
                reason="expired",
            )
            pending_exception = EmailVerificationCodeExpired()
        elif challenge.attempt_count >= challenge.max_attempts:
            _record_verification_event(
                user=locked_user,
                event_type=(IdentitySecurityEvent.EventType.EMAIL_VERIFICATION_FAILED),
                outcome=IdentitySecurityEvent.Outcome.BLOCKED,
                challenge=challenge,
                ip_address=ip_address,
                user_agent=user_agent,
                reason="attempt_limit",
            )
            pending_exception = EmailVerificationAttemptLimitReached()
        elif not check_password(code.strip(), challenge.code_digest):
            challenge = increment_email_verification_attempt(
                challenge=challenge,
            )
            limit_reached = challenge.attempt_count >= challenge.max_attempts
            _record_verification_event(
                user=locked_user,
                event_type=(IdentitySecurityEvent.EventType.EMAIL_VERIFICATION_FAILED),
                outcome=(
                    IdentitySecurityEvent.Outcome.BLOCKED
                    if limit_reached
                    else IdentitySecurityEvent.Outcome.FAILURE
                ),
                challenge=challenge,
                ip_address=ip_address,
                user_agent=user_agent,
                reason=("attempt_limit" if limit_reached else "invalid_code"),
            )
            pending_exception = (
                EmailVerificationAttemptLimitReached()
                if limit_reached
                else EmailVerificationCodeInvalid()
            )
        else:
            consume_email_verification_challenge(
                challenge=challenge,
            )
            mark_user_email_verified(
                user=locked_user,
            )
            _record_verification_event(
                user=locked_user,
                event_type=(
                    IdentitySecurityEvent.EventType.EMAIL_VERIFICATION_SUCCEEDED
                ),
                outcome=IdentitySecurityEvent.Outcome.SUCCESS,
                challenge=challenge,
                ip_address=ip_address,
                user_agent=user_agent,
            )

    if pending_exception is not None:
        raise pending_exception
    user.refresh_from_db()
    return user
