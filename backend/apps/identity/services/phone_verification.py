import secrets
import string
from datetime import timedelta

from common.exceptions.modules.identity import (
    PhoneVerificationAttemptLimitReached,
    PhoneVerificationChallengeNotFound,
    PhoneVerificationCodeExpired,
    PhoneVerificationCodeInvalid,
    PhoneVerificationDailyLimitReached,
    PhoneVerificationResendCooldown,
)
from common.logging import get_logger
from django.conf import settings
from django.contrib.auth.hashers import check_password, make_password
from django.db import transaction
from django.utils import timezone

from ..models import IdentitySecurityEvent, PhoneVerificationChallenge, User
from ..repositories import (
    consume_phone_verification_challenge,
    count_phone_challenges_since,
    create_phone_verification_challenge,
    get_latest_phone_challenge_including_invalidated,
    get_phone_verification_challenge_for_update,
    increment_phone_verification_attempt,
    invalidate_outstanding_phone_verification_challenges,
    mark_user_phone_verified,
)
from ..sms import SmsProviderError, get_sms_provider
from .security_event import record_identity_security_event

logger = get_logger(__name__)


def _generate_code() -> str:
    length = settings.EMAIL_VERIFICATION_CODE_LENGTH
    return "".join(secrets.choice(string.digits) for _ in range(length))


def _record_event(
    *,
    user,
    event_type,
    outcome,
    challenge=None,
    ip_address=None,
    user_agent="",
    device_id=None,
    reason=None,
):
    metadata = {"channel": "phone"}
    if reason:
        metadata["reason"] = reason
    if challenge is not None:
        metadata["purpose"] = challenge.purpose
    return record_identity_security_event(
        user=user,
        event_type=event_type,
        outcome=outcome,
        challenge_id=(challenge.id if challenge else None),
        ip_address=ip_address,
        user_agent=user_agent,
        device_id=device_id,
        metadata=metadata,
    )


def _deliver_code(*, user_id, challenge_id, phone_number, code, purpose):
    user = User.objects.filter(pk=user_id).first()
    if user is None:
        return
    challenge = PhoneVerificationChallenge.all_objects.filter(pk=challenge_id).first()
    if challenge is None:
        return

    purpose_text = (
        "password reset code"
        if purpose == PhoneVerificationChallenge.Purpose.PASSWORD_RESET
        else "verification code"
    )
    text = (
        f"Tunakuza: Your {purpose_text} is {code}. "
        f"It expires in {settings.EMAIL_VERIFICATION_TTL_MINUTES} minutes. "
        "Do not share this code."
    )
    try:
        receipt = get_sms_provider().send(
            to=phone_number,
            text=text,
            reference=f"tunakuza-{challenge.id}",
        )
    except SmsProviderError as exc:
        logger.warning(
            "SMS delivery failed: challenge_id=%s reason=%s",
            challenge.id,
            exc.code,
        )
        _record_event(
            user=user,
            event_type=IdentitySecurityEvent.EventType.PHONE_DELIVERY_FAILED,
            outcome=IdentitySecurityEvent.Outcome.FAILURE,
            challenge=challenge,
            reason=exc.code,
        )
    except Exception:
        logger.exception("Unexpected SMS delivery failure: challenge_id=%s", challenge.id)
        _record_event(
            user=user,
            event_type=IdentitySecurityEvent.EventType.PHONE_DELIVERY_FAILED,
            outcome=IdentitySecurityEvent.Outcome.FAILURE,
            challenge=challenge,
            reason="delivery_internal_error",
        )
    else:
        _record_event(
            user=user,
            event_type=IdentitySecurityEvent.EventType.PHONE_DELIVERY_SUCCEEDED,
            outcome=IdentitySecurityEvent.Outcome.SUCCESS,
            challenge=challenge,
        )
        logger.info(
            "SMS delivered to provider: challenge_id=%s provider_message_id=%s",
            challenge.id,
            receipt.provider_message_id,
        )


def issue_phone_verification_challenge(
    *,
    user: User,
    purpose: str = PhoneVerificationChallenge.Purpose.REGISTRATION,
    enforce_resend_limits=False,
    ip_address=None,
    user_agent="",
    device_id=None,
) -> PhoneVerificationChallenge:
    if not user.phone_number:
        raise ValueError("A phone number is required for phone verification.")

    pending_exception = None
    challenge = None
    code = None

    with transaction.atomic():
        locked_user = User.objects.select_for_update().get(pk=user.pk)
        now = timezone.now()

        if enforce_resend_limits:
            latest = get_latest_phone_challenge_including_invalidated(
                user=locked_user,
                purpose=purpose,
            )
            cooldown = timedelta(
                seconds=settings.EMAIL_VERIFICATION_RESEND_COOLDOWN_SECONDS
            )
            daily_count = count_phone_challenges_since(
                user=locked_user,
                purpose=purpose,
                since=now - timedelta(hours=24),
            )
            if latest is not None and latest.created_at > now - cooldown:
                _record_event(
                    user=locked_user,
                    event_type=IdentitySecurityEvent.EventType.PHONE_RESEND_BLOCKED,
                    outcome=IdentitySecurityEvent.Outcome.BLOCKED,
                    challenge=latest,
                    ip_address=ip_address,
                    user_agent=user_agent,
                    device_id=device_id,
                    reason="cooldown",
                )
                pending_exception = PhoneVerificationResendCooldown()
            elif daily_count >= settings.EMAIL_VERIFICATION_DAILY_LIMIT:
                _record_event(
                    user=locked_user,
                    event_type=IdentitySecurityEvent.EventType.PHONE_RESEND_BLOCKED,
                    outcome=IdentitySecurityEvent.Outcome.BLOCKED,
                    challenge=latest,
                    ip_address=ip_address,
                    user_agent=user_agent,
                    device_id=device_id,
                    reason="daily_limit",
                )
                pending_exception = PhoneVerificationDailyLimitReached()

        if pending_exception is None:
            code = _generate_code()
            invalidate_outstanding_phone_verification_challenges(
                user=locked_user,
                purpose=purpose,
            )
            challenge = create_phone_verification_challenge(
                user=locked_user,
                purpose=purpose,
                code_digest=make_password(code),
                expires_at=now
                + timedelta(minutes=settings.EMAIL_VERIFICATION_TTL_MINUTES),
                max_attempts=settings.EMAIL_VERIFICATION_MAX_ATTEMPTS,
            )
            _record_event(
                user=locked_user,
                event_type=IdentitySecurityEvent.EventType.PHONE_CHALLENGE_ISSUED,
                outcome=IdentitySecurityEvent.Outcome.SUCCESS,
                challenge=challenge,
                ip_address=ip_address,
                user_agent=user_agent,
                device_id=device_id,
            )
            transaction.on_commit(
                lambda: _deliver_code(
                    user_id=locked_user.id,
                    challenge_id=challenge.id,
                    phone_number=locked_user.phone_number,
                    code=code,
                    purpose=purpose,
                ),
                robust=True,
            )

    if pending_exception is not None:
        raise pending_exception
    return challenge


def verify_phone_verification_code(
    *,
    user: User,
    code: str,
    purpose: str = PhoneVerificationChallenge.Purpose.REGISTRATION,
    mark_verified: bool = True,
    ip_address=None,
    user_agent="",
    device_id=None,
) -> User:
    pending_exception = None

    with transaction.atomic():
        locked_user = User.objects.select_for_update().get(pk=user.pk)
        challenge = get_phone_verification_challenge_for_update(
            user=locked_user,
            purpose=purpose,
        )
        if challenge is None:
            pending_exception = PhoneVerificationChallengeNotFound()
            reason = "challenge_not_found"
        elif challenge.is_expired:
            pending_exception = PhoneVerificationCodeExpired()
            reason = "expired"
        elif challenge.attempt_count >= challenge.max_attempts:
            pending_exception = PhoneVerificationAttemptLimitReached()
            reason = "attempt_limit"
        elif not check_password(code.strip(), challenge.code_digest):
            challenge = increment_phone_verification_attempt(challenge=challenge)
            reached = challenge.attempt_count >= challenge.max_attempts
            pending_exception = (
                PhoneVerificationAttemptLimitReached()
                if reached
                else PhoneVerificationCodeInvalid()
            )
            reason = "attempt_limit" if reached else "invalid_code"
        else:
            consume_phone_verification_challenge(challenge=challenge)
            if mark_verified:
                mark_user_phone_verified(user=locked_user)
            reason = ""

        _record_event(
            user=locked_user,
            event_type=(
                IdentitySecurityEvent.EventType.PHONE_VERIFICATION_FAILED
                if pending_exception
                else IdentitySecurityEvent.EventType.PHONE_VERIFICATION_SUCCEEDED
            ),
            outcome=(
                IdentitySecurityEvent.Outcome.FAILURE
                if pending_exception
                else IdentitySecurityEvent.Outcome.SUCCESS
            ),
            challenge=challenge,
            ip_address=ip_address,
            user_agent=user_agent,
            device_id=device_id,
            reason=reason or None,
        )

    if pending_exception is not None:
        raise pending_exception
    user.refresh_from_db()
    return user
