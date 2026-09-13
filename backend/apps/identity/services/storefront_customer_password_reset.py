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
    PhoneVerificationDailyLimitReached,
    PhoneVerificationResendCooldown,
)
from django.conf import settings
from django.contrib.auth.hashers import check_password
from django.db import transaction
from django.utils import timezone

from ..models import (
    StorefrontCustomer,
    StorefrontCustomerPasswordResetGrant,
    StorefrontCustomerSession,
    StorefrontCustomerVerificationChallenge,
)
from .storefront_customer_registration import (
    issue_storefront_customer_verification_challenge,
)
from .storefront_customer_session import revoke_all_storefront_customer_sessions


def _digest_grant(raw_grant: str) -> str:
    return sha256(raw_grant.encode("utf-8")).hexdigest()


def _resolve_customer(*, business, identifier: str):
    value = identifier.strip()
    if "@" in value:
        normalized = value.lower()
        customer = StorefrontCustomer.objects.filter(
            business=business,
            email__iexact=normalized,
        ).first()
        return normalized, StorefrontCustomerVerificationChallenge.Channel.EMAIL, customer

    customer = StorefrontCustomer.objects.filter(
        business=business,
        phone_number=value,
    ).first()
    return value, StorefrontCustomerVerificationChallenge.Channel.PHONE, customer


def request_storefront_customer_password_reset(*, business, identifier: str) -> None:
    """Issue a reset code without revealing whether the customer is eligible."""

    _, channel, customer = _resolve_customer(
        business=business,
        identifier=identifier,
    )
    verified = bool(
        customer
        and (
            customer.is_email_verified
            if channel == StorefrontCustomerVerificationChallenge.Channel.EMAIL
            else customer.is_phone_verified
        )
    )
    if (
        customer is None
        or not customer.is_active
        or not verified
        or not customer.has_usable_password()
    ):
        return

    try:
        issue_storefront_customer_verification_challenge(
            customer=customer,
            channel=channel,
            purpose=StorefrontCustomerVerificationChallenge.Purpose.PASSWORD_RESET,
            enforce_resend_limits=True,
        )
    except (
        EmailVerificationDailyLimitReached,
        EmailVerificationResendCooldown,
        PhoneVerificationDailyLimitReached,
        PhoneVerificationResendCooldown,
    ):
        return


def verify_storefront_customer_password_reset_code(
    *,
    business,
    identifier: str,
    code: str,
    device_id=None,
) -> tuple[str, object]:
    """Verify a reset challenge and return one short-lived raw reset grant."""

    _, channel, customer = _resolve_customer(
        business=business,
        identifier=identifier,
    )
    if customer is None:
        raise PasswordResetChallengeInvalid()

    pending_exception = None
    raw_grant = ""
    grant_expires_at = None

    with transaction.atomic():
        locked_customer = StorefrontCustomer.objects.select_for_update().get(pk=customer.pk)
        challenge = (
            StorefrontCustomerVerificationChallenge.objects.select_for_update()
            .filter(
                customer=locked_customer,
                channel=channel,
                purpose=StorefrontCustomerVerificationChallenge.Purpose.PASSWORD_RESET,
                consumed_at__isnull=True,
            )
            .order_by("-created_at")
            .first()
        )

        if challenge is None or challenge.is_expired or challenge.is_consumed:
            pending_exception = PasswordResetChallengeInvalid()
        elif challenge.attempt_count >= challenge.max_attempts:
            pending_exception = PasswordResetAttemptLimitReached()
        elif not check_password(code.strip(), challenge.code_digest):
            challenge.attempt_count += 1
            challenge.save(update_fields=["attempt_count", "updated_at"])
            pending_exception = (
                PasswordResetAttemptLimitReached()
                if challenge.attempt_count >= challenge.max_attempts
                else PasswordResetChallengeInvalid()
            )
        else:
            challenge.consumed_at = timezone.now()
            challenge.save(update_fields=["consumed_at", "updated_at"])
            raw_grant = secrets.token_urlsafe(32)
            grant_expires_at = timezone.now() + timedelta(
                minutes=settings.PASSWORD_RESET_GRANT_TTL_MINUTES,
            )
            StorefrontCustomerPasswordResetGrant.objects.create(
                customer=locked_customer,
                challenge_id=challenge.id,
                token_digest=_digest_grant(raw_grant),
                expires_at=grant_expires_at,
                device_id=device_id,
            )

    if pending_exception is not None:
        raise pending_exception
    return raw_grant, grant_expires_at


def confirm_storefront_customer_password_reset(
    *,
    raw_grant: str,
    new_password: str,
    device_id=None,
) -> None:
    """Replace the password and revoke every existing customer session."""

    pending_exception = None

    with transaction.atomic():
        grant = (
            StorefrontCustomerPasswordResetGrant.objects.select_for_update()
            .filter(token_digest=_digest_grant(raw_grant))
            .first()
        )
        if (
            grant is None
            or grant.consumed_at is not None
            or grant.expires_at <= timezone.now()
            or (grant.device_id and grant.device_id != device_id)
        ):
            pending_exception = PasswordResetGrantInvalid()
        else:
            customer = grant.customer
            if customer.check_password(new_password):
                pending_exception = PasswordResetPasswordUnchanged()
            else:
                customer.set_password(new_password)
                customer.save(update_fields=["password", "updated_at"])
                grant.consumed_at = timezone.now()
                grant.save(update_fields=["consumed_at", "updated_at"])
                revoke_all_storefront_customer_sessions(
                    customer=customer,
                    reason=StorefrontCustomerSession.RevokeReason.PASSWORD_RESET,
                )

    if pending_exception is not None:
        raise pending_exception
