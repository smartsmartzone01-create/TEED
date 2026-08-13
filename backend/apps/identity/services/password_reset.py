import secrets
from datetime import timedelta
from hashlib import sha256

from common.exceptions.modules.identity import (
    EmailVerificationDailyLimitReached,
    EmailVerificationResendCooldown,
    PasswordResetAttemptLimitReached,
    PasswordResetChallengeInvalid,
    PasswordResetGrantInvalid,
    PasswordResetPasswordUnchanged,
)
from common.logging import get_logger
from django.conf import settings
from django.contrib.auth.hashers import check_password
from django.db import transaction
from django.utils import timezone

from ..models import (
    EmailDelivery,
    EmailVerificationChallenge,
    IdentitySecurityEvent,
    User,
    UserSession,
)
from ..repositories import (
    consume_email_verification_challenge,
    consume_password_reset_grant,
    create_password_reset_grant,
    get_email_verification_challenge_for_update,
    get_password_reset_grant_for_update,
    increment_email_verification_attempt,
)
from ..selectors import get_user_by_email
from .email_delivery import enqueue_email_delivery
from .email_verification import issue_email_verification_challenge
from .security_event import hash_identity_identifier, record_identity_security_event
from .session import revoke_all_user_sessions

logger = get_logger(__name__)


def _digest_grant(raw_grant: str) -> str:
    return sha256(raw_grant.encode("utf-8")).hexdigest()


def _assurance_level(*, user, device_id, ip_address) -> str:
    if (
        device_id
        and UserSession.all_objects.filter(user=user, device_id=device_id).exists()
    ):
        return "known_device"
    if (
        ip_address
        and UserSession.all_objects.filter(user=user, ip_address=ip_address).exists()
    ):
        return "familiar_network"
    return "standard"


def request_password_reset(
    *,
    email: str,
    ip_address=None,
    user_agent="",
    device_id=None,
) -> None:
    """Issue an email challenge while keeping the public response non-enumerating."""
    normalized_email = email.strip().lower()
    user = get_user_by_email(email=normalized_email)
    if (
        user is None
        or not user.is_active
        or not user.is_email_verified
        or not user.has_usable_password()
    ):
        if user is None:
            reason = "account_not_found"
        elif not user.is_active:
            reason = "account_inactive"
        elif not user.is_email_verified:
            reason = "email_unverified"
        else:
            reason = "password_unusable"
        logger.info(
            "Password reset email was not issued: identifier_hash=%s reason=%s",
            hash_identity_identifier(normalized_email),
            reason,
        )
        record_identity_security_event(
            user=user,
            identifier=normalized_email,
            event_type=IdentitySecurityEvent.EventType.PASSWORD_RESET_REQUESTED,
            outcome=IdentitySecurityEvent.Outcome.SUCCESS,
            ip_address=ip_address,
            user_agent=user_agent,
            device_id=device_id,
            metadata={"eligible": False},
        )
        return

    identifier_hash = hash_identity_identifier(normalized_email)
    recent_count = IdentitySecurityEvent.objects.filter(
        identifier_hash=identifier_hash,
        event_type=IdentitySecurityEvent.EventType.PASSWORD_RESET_REQUESTED,
        created_at__gte=timezone.now() - timedelta(hours=1),
    ).count()
    if recent_count >= settings.PASSWORD_RESET_REQUESTS_PER_HOUR:
        logger.info(
            "Password reset email was not issued: identifier_hash=%s reason=%s",
            identifier_hash,
            "adaptive_rate_limit",
        )
        record_identity_security_event(
            user=user,
            identifier=normalized_email,
            event_type=(IdentitySecurityEvent.EventType.PASSWORD_RESET_REQUEST_BLOCKED),
            outcome=IdentitySecurityEvent.Outcome.BLOCKED,
            ip_address=ip_address,
            user_agent=user_agent,
            device_id=device_id,
            metadata={"reason": "adaptive_rate_limit"},
        )
        return

    assurance = _assurance_level(
        user=user,
        device_id=device_id,
        ip_address=ip_address,
    )
    try:
        issue_email_verification_challenge(
            user=user,
            purpose=EmailVerificationChallenge.Purpose.PASSWORD_RESET,
            enforce_resend_limits=True,
            ip_address=ip_address,
            user_agent=user_agent,
            device_id=device_id,
        )
    except (
        EmailVerificationDailyLimitReached,
        EmailVerificationResendCooldown,
    ) as exc:
        logger.info(
            "Password reset email was not issued: identifier_hash=%s reason=%s",
            identifier_hash,
            exc.default_code,
        )
        record_identity_security_event(
            user=user,
            identifier=normalized_email,
            event_type=(IdentitySecurityEvent.EventType.PASSWORD_RESET_REQUEST_BLOCKED),
            outcome=IdentitySecurityEvent.Outcome.BLOCKED,
            ip_address=ip_address,
            user_agent=user_agent,
            device_id=device_id,
            metadata={"reason": exc.default_code},
        )
        return
    logger.info(
        "Password reset challenge and email delivery were issued: identifier_hash=%s",
        identifier_hash,
    )
    record_identity_security_event(
        user=user,
        identifier=normalized_email,
        event_type=IdentitySecurityEvent.EventType.PASSWORD_RESET_REQUESTED,
        outcome=IdentitySecurityEvent.Outcome.SUCCESS,
        ip_address=ip_address,
        user_agent=user_agent,
        device_id=device_id,
        metadata={"eligible": True, "assurance": assurance},
    )


def verify_password_reset_code(
    *,
    email: str,
    code: str,
    ip_address=None,
    user_agent="",
    device_id=None,
) -> tuple[str, object]:
    normalized_email = email.strip().lower()
    user = get_user_by_email(email=normalized_email)
    if user is None:
        record_identity_security_event(
            identifier=normalized_email,
            event_type=IdentitySecurityEvent.EventType.PASSWORD_RESET_CODE_FAILED,
            outcome=IdentitySecurityEvent.Outcome.FAILURE,
            ip_address=ip_address,
            user_agent=user_agent,
            device_id=device_id,
            metadata={"reason": "invalid_challenge"},
        )
        raise PasswordResetChallengeInvalid()

    pending_exception = None
    raw_grant = ""
    grant_expires_at = None
    with transaction.atomic():
        locked_user = User.objects.select_for_update().get(pk=user.pk)
        challenge = get_email_verification_challenge_for_update(
            user=locked_user,
            purpose=EmailVerificationChallenge.Purpose.PASSWORD_RESET,
        )
        if challenge is None or challenge.is_expired or challenge.is_consumed:
            pending_exception = PasswordResetChallengeInvalid()
            reason = "invalid_challenge"
        elif challenge.attempt_count >= challenge.max_attempts:
            pending_exception = PasswordResetAttemptLimitReached()
            reason = "attempt_limit"
        elif not check_password(code.strip(), challenge.code_digest):
            challenge = increment_email_verification_attempt(challenge=challenge)
            reached = challenge.attempt_count >= challenge.max_attempts
            pending_exception = (
                PasswordResetAttemptLimitReached()
                if reached
                else PasswordResetChallengeInvalid()
            )
            reason = "attempt_limit" if reached else "invalid_code"
        else:
            consume_email_verification_challenge(challenge=challenge)
            raw_grant = secrets.token_urlsafe(32)
            grant_expires_at = timezone.now() + timedelta(
                minutes=settings.PASSWORD_RESET_GRANT_TTL_MINUTES
            )
            create_password_reset_grant(
                user=locked_user,
                challenge_id=challenge.id,
                token_digest=_digest_grant(raw_grant),
                expires_at=grant_expires_at,
                device_id=device_id,
            )
            reason = ""

        record_identity_security_event(
            user=locked_user,
            identifier=normalized_email,
            event_type=(
                IdentitySecurityEvent.EventType.PASSWORD_RESET_CODE_FAILED
                if pending_exception
                else IdentitySecurityEvent.EventType.PASSWORD_RESET_CODE_SUCCEEDED
            ),
            outcome=(
                IdentitySecurityEvent.Outcome.FAILURE
                if pending_exception
                else IdentitySecurityEvent.Outcome.SUCCESS
            ),
            challenge_id=(challenge.id if challenge else None),
            ip_address=ip_address,
            user_agent=user_agent,
            device_id=device_id,
            metadata={"reason": reason} if reason else {},
        )

    if pending_exception:
        raise pending_exception
    return raw_grant, grant_expires_at


def confirm_password_reset(
    *,
    raw_grant: str,
    new_password: str,
    ip_address=None,
    user_agent="",
    device_id=None,
) -> None:
    pending_exception = None
    with transaction.atomic():
        grant = get_password_reset_grant_for_update(
            token_digest=_digest_grant(raw_grant)
        )
        if (
            grant is None
            or grant.consumed_at is not None
            or grant.expires_at <= timezone.now()
            or (grant.device_id and grant.device_id != device_id)
        ):
            pending_exception = PasswordResetGrantInvalid()
        else:
            user = grant.user
            if user.check_password(new_password):
                pending_exception = PasswordResetPasswordUnchanged()
                record_identity_security_event(
                    user=user,
                    event_type=IdentitySecurityEvent.EventType.PASSWORD_RESET_FAILED,
                    outcome=IdentitySecurityEvent.Outcome.FAILURE,
                    challenge_id=grant.challenge_id,
                    ip_address=ip_address,
                    user_agent=user_agent,
                    device_id=device_id,
                    metadata={"reason": "password_unchanged"},
                )
            else:
                user.set_password(new_password)
                user.save(update_fields=["password", "updated_at"])
                consume_password_reset_grant(grant=grant)
                revoke_all_user_sessions(
                    user=user,
                    reason=UserSession.RevokeReason.PASSWORD_RESET,
                )
                record_identity_security_event(
                    user=user,
                    event_type=(
                        IdentitySecurityEvent.EventType.PASSWORD_RESET_SUCCEEDED
                    ),
                    outcome=IdentitySecurityEvent.Outcome.SUCCESS,
                    challenge_id=grant.challenge_id,
                    ip_address=ip_address,
                    user_agent=user_agent,
                    device_id=device_id,
                )
                enqueue_email_delivery(
                    user=user,
                    template=EmailDelivery.Template.PASSWORD_CHANGED,
                    payload={},
                    idempotency_key=f"password-changed:{grant.id}",
                    challenge_id=grant.challenge_id,
                )

    if pending_exception:
        if isinstance(pending_exception, PasswordResetGrantInvalid):
            record_identity_security_event(
                event_type=IdentitySecurityEvent.EventType.PASSWORD_RESET_FAILED,
                outcome=IdentitySecurityEvent.Outcome.FAILURE,
                ip_address=ip_address,
                user_agent=user_agent,
                device_id=device_id,
                metadata={"reason": "invalid_grant"},
            )
        raise pending_exception
