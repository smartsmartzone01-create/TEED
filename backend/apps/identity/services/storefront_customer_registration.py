import secrets
import string
from datetime import timedelta

from common.exceptions.modules.identity import (
    EmailAlreadyRegistered,
    EmailVerificationAttemptLimitReached,
    EmailVerificationChallengeNotFound,
    EmailVerificationCodeExpired,
    EmailVerificationCodeInvalid,
    EmailVerificationDailyLimitReached,
    EmailVerificationResendCooldown,
    PhoneNumberAlreadyRegistered,
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
from django.db import IntegrityError, transaction
from django.utils import timezone
from django.utils.module_loading import import_string

from ..email import DeliveryMessage, DeliveryProviderError
from ..models import (
    StorefrontCustomer,
    StorefrontCustomerVerificationChallenge,
)
from ..sms import SmsProviderError, get_sms_provider

logger = get_logger(__name__)


def _generate_verification_code() -> str:
    length = settings.EMAIL_VERIFICATION_CODE_LENGTH
    return "".join(secrets.choice(string.digits) for _ in range(length))


def _email_provider():
    provider_class = import_string(settings.EMAIL_DELIVERY_PROVIDER)
    return provider_class()


def _delivery_text(*, code: str, purpose: str) -> str:
    purpose_text = (
        "password reset code"
        if purpose == StorefrontCustomerVerificationChallenge.Purpose.PASSWORD_RESET
        else "verification code"
    )
    return (
        f"Tunakuza: Your storefront {purpose_text} is {code}. "
        f"It expires in {settings.EMAIL_VERIFICATION_TTL_MINUTES} minutes. "
        "Do not share this code."
    )


def _deliver_email_code(*, customer_id, challenge_id, code, purpose) -> None:
    customer = StorefrontCustomer.objects.filter(pk=customer_id).first()
    challenge = StorefrontCustomerVerificationChallenge.all_objects.filter(
        pk=challenge_id,
    ).first()
    if customer is None or challenge is None or not customer.email:
        return

    try:
        receipt = _email_provider().send(
            message=DeliveryMessage(
                subject="Your Tunakuza storefront verification code",
                body=_delivery_text(code=code, purpose=purpose),
                recipient=customer.email,
            ),
            idempotency_key=f"storefront-challenge:{challenge.id}",
        )
    except DeliveryProviderError as exc:
        logger.warning(
            "Storefront email delivery failed: challenge_id=%s reason=%s",
            challenge.id,
            exc.code,
        )
    except Exception:
        logger.exception(
            "Unexpected storefront email delivery failure: challenge_id=%s",
            challenge.id,
        )
    else:
        logger.info(
            "Storefront email delivered: challenge_id=%s provider_message_id=%s",
            challenge.id,
            receipt.provider_message_id,
        )


def _deliver_phone_code(*, customer_id, challenge_id, code, purpose) -> None:
    customer = StorefrontCustomer.objects.filter(pk=customer_id).first()
    challenge = StorefrontCustomerVerificationChallenge.all_objects.filter(
        pk=challenge_id,
    ).first()
    if customer is None or challenge is None or not customer.phone_number:
        return

    try:
        receipt = get_sms_provider().send(
            to=customer.phone_number,
            text=_delivery_text(code=code, purpose=purpose),
            reference=f"tunakuza-storefront-{challenge.id}",
        )
    except SmsProviderError as exc:
        logger.warning(
            "Storefront SMS delivery failed: challenge_id=%s reason=%s",
            challenge.id,
            exc.code,
        )
    except Exception:
        logger.exception(
            "Unexpected storefront SMS delivery failure: challenge_id=%s",
            challenge.id,
        )
    else:
        logger.info(
            "Storefront SMS delivered: challenge_id=%s provider_message_id=%s",
            challenge.id,
            receipt.provider_message_id,
        )


def _channel_exceptions(channel: str):
    if channel == StorefrontCustomerVerificationChallenge.Channel.EMAIL:
        return {
            "not_found": EmailVerificationChallengeNotFound,
            "expired": EmailVerificationCodeExpired,
            "invalid": EmailVerificationCodeInvalid,
            "attempt_limit": EmailVerificationAttemptLimitReached,
            "cooldown": EmailVerificationResendCooldown,
            "daily_limit": EmailVerificationDailyLimitReached,
        }
    if channel == StorefrontCustomerVerificationChallenge.Channel.PHONE:
        return {
            "not_found": PhoneVerificationChallengeNotFound,
            "expired": PhoneVerificationCodeExpired,
            "invalid": PhoneVerificationCodeInvalid,
            "attempt_limit": PhoneVerificationAttemptLimitReached,
            "cooldown": PhoneVerificationResendCooldown,
            "daily_limit": PhoneVerificationDailyLimitReached,
        }
    raise ValueError("Unsupported storefront verification channel.")


def issue_storefront_customer_verification_challenge(
    *,
    customer: StorefrontCustomer,
    channel: str,
    purpose: str = StorefrontCustomerVerificationChallenge.Purpose.REGISTRATION,
    enforce_resend_limits: bool = False,
) -> StorefrontCustomerVerificationChallenge:
    """Issue a hashed customer challenge and deliver through shared providers."""

    exceptions = _channel_exceptions(channel)

    with transaction.atomic():
        locked_customer = StorefrontCustomer.objects.select_for_update().get(
            pk=customer.pk,
        )
        destination = (
            locked_customer.email
            if channel == StorefrontCustomerVerificationChallenge.Channel.EMAIL
            else locked_customer.phone_number
        )
        if not destination:
            raise ValueError("The selected verification channel is not configured.")

        now = timezone.now()
        previous = StorefrontCustomerVerificationChallenge.all_objects.filter(
            customer=locked_customer,
            channel=channel,
            purpose=purpose,
        ).order_by("-created_at")

        if enforce_resend_limits:
            latest = previous.first()
            cooldown = timedelta(
                seconds=settings.EMAIL_VERIFICATION_RESEND_COOLDOWN_SECONDS,
            )
            if latest is not None and latest.created_at > now - cooldown:
                raise exceptions["cooldown"]()

            daily_count = previous.filter(
                created_at__gte=now - timedelta(hours=24),
            ).count()
            if daily_count >= settings.EMAIL_VERIFICATION_DAILY_LIMIT:
                raise exceptions["daily_limit"]()

        StorefrontCustomerVerificationChallenge.all_objects.filter(
            customer=locked_customer,
            channel=channel,
            purpose=purpose,
            consumed_at__isnull=True,
            is_deleted=False,
        ).update(
            is_deleted=True,
            deleted_at=now,
            updated_at=now,
        )

        code = _generate_verification_code()
        challenge = StorefrontCustomerVerificationChallenge.objects.create(
            customer=locked_customer,
            channel=channel,
            purpose=purpose,
            destination=destination,
            code_digest=make_password(code),
            expires_at=now
            + timedelta(minutes=settings.EMAIL_VERIFICATION_TTL_MINUTES),
            max_attempts=settings.EMAIL_VERIFICATION_MAX_ATTEMPTS,
        )

        if channel == StorefrontCustomerVerificationChallenge.Channel.EMAIL:
            transaction.on_commit(
                lambda: _deliver_email_code(
                    customer_id=locked_customer.id,
                    challenge_id=challenge.id,
                    code=code,
                    purpose=purpose,
                ),
                robust=True,
            )
        else:
            transaction.on_commit(
                lambda: _deliver_phone_code(
                    customer_id=locked_customer.id,
                    challenge_id=challenge.id,
                    code=code,
                    purpose=purpose,
                ),
                robust=True,
            )

    return challenge


def verify_storefront_customer_verification_code(
    *,
    customer: StorefrontCustomer,
    channel: str,
    code: str,
    purpose: str = StorefrontCustomerVerificationChallenge.Purpose.REGISTRATION,
) -> StorefrontCustomer:
    """Validate one customer challenge and mark only that identity channel verified."""

    exceptions = _channel_exceptions(channel)
    pending_exception = None

    with transaction.atomic():
        locked_customer = StorefrontCustomer.objects.select_for_update().get(
            pk=customer.pk,
        )
        challenge = (
            StorefrontCustomerVerificationChallenge.objects.select_for_update()
            .filter(
                customer=locked_customer,
                channel=channel,
                purpose=purpose,
                consumed_at__isnull=True,
            )
            .order_by("-created_at")
            .first()
        )

        if challenge is None:
            pending_exception = exceptions["not_found"]()
        elif challenge.is_expired:
            pending_exception = exceptions["expired"]()
        elif challenge.attempt_count >= challenge.max_attempts:
            pending_exception = exceptions["attempt_limit"]()
        elif not check_password(code.strip(), challenge.code_digest):
            challenge.attempt_count += 1
            challenge.save(update_fields=["attempt_count", "updated_at"])
            pending_exception = (
                exceptions["attempt_limit"]()
                if challenge.attempt_count >= challenge.max_attempts
                else exceptions["invalid"]()
            )
        else:
            challenge.consumed_at = timezone.now()
            challenge.save(update_fields=["consumed_at", "updated_at"])
            if channel == StorefrontCustomerVerificationChallenge.Channel.EMAIL:
                locked_customer.is_email_verified = True
                update_fields = ["is_email_verified", "updated_at"]
            else:
                locked_customer.is_phone_verified = True
                update_fields = ["is_phone_verified", "updated_at"]
            locked_customer.save(update_fields=update_fields)

    if pending_exception is not None:
        raise pending_exception

    customer.refresh_from_db()
    return customer


def register_storefront_customer_with_email(
    *,
    business,
    email: str,
    password: str,
    first_name: str = "",
    last_name: str = "",
) -> StorefrontCustomer:
    normalized_email = email.strip().lower()
    if StorefrontCustomer.objects.filter(
        business=business,
        email__iexact=normalized_email,
    ).exists():
        raise EmailAlreadyRegistered()

    try:
        with transaction.atomic():
            customer = StorefrontCustomer(
                business=business,
                email=normalized_email,
                first_name=first_name.strip(),
                last_name=last_name.strip(),
            )
            customer.set_password(password)
            customer.save()
            issue_storefront_customer_verification_challenge(
                customer=customer,
                channel=StorefrontCustomerVerificationChallenge.Channel.EMAIL,
            )
    except IntegrityError as exc:
        raise EmailAlreadyRegistered() from exc

    return customer


def register_storefront_customer_with_phone(
    *,
    business,
    phone_number: str,
    password: str,
    first_name: str = "",
    last_name: str = "",
) -> StorefrontCustomer:
    normalized_phone = phone_number.strip()
    if StorefrontCustomer.objects.filter(
        business=business,
        phone_number=normalized_phone,
    ).exists():
        raise PhoneNumberAlreadyRegistered()

    try:
        with transaction.atomic():
            customer = StorefrontCustomer(
                business=business,
                phone_number=normalized_phone,
                first_name=first_name.strip(),
                last_name=last_name.strip(),
            )
            customer.set_password(password)
            customer.save()
            issue_storefront_customer_verification_challenge(
                customer=customer,
                channel=StorefrontCustomerVerificationChallenge.Channel.PHONE,
            )
    except IntegrityError as exc:
        raise PhoneNumberAlreadyRegistered() from exc

    return customer
