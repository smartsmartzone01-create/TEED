from datetime import datetime
from datetime import timezone as datetime_timezone
from hashlib import sha256
from uuid import UUID

from common.exceptions.modules.identity import (
    EmailVerificationRequired,
    InvalidCredentials,
    PhoneVerificationRequired,
    RefreshTokenInvalid,
    RefreshTokenReuseDetected,
    SessionExpired,
    SessionInvalid,
)
from django.conf import settings
from django.db import transaction
from django.utils import timezone
from rest_framework_simplejwt.exceptions import TokenError
from rest_framework_simplejwt.tokens import RefreshToken, UntypedToken

from ..models import StorefrontCustomer, StorefrontCustomerSession
from ..repositories import (
    create_storefront_customer_session,
    get_active_storefront_customer_sessions_for_update,
    get_storefront_customer_session_for_update,
    revoke_storefront_customer_session,
    update_storefront_customer_session_refresh,
)

STOREFRONT_CUSTOMER_AUDIENCE = "storefront_customer"


def _hash_user_agent(user_agent: str) -> str:
    if not user_agent:
        return ""
    return sha256(user_agent.encode("utf-8")).hexdigest()


def _describe_user_agent(user_agent: str) -> dict[str, str]:
    value = user_agent.casefold()
    if "iphone" in value or "ipad" in value:
        operating_system, device_label = "iOS", "Apple mobile device"
    elif "android" in value:
        operating_system, device_label = "Android", "Android device"
    elif "windows" in value:
        operating_system, device_label = "Windows", "Windows computer"
    elif "mac os" in value or "macintosh" in value:
        operating_system, device_label = "macOS", "Mac computer"
    elif "linux" in value:
        operating_system, device_label = "Linux", "Linux computer"
    else:
        operating_system, device_label = "", "Unknown device"

    if "edg/" in value:
        browser = "Edge"
    elif "firefox/" in value:
        browser = "Firefox"
    elif "chrome/" in value or "crios/" in value:
        browser = "Chrome"
    elif "safari/" in value:
        browser = "Safari"
    else:
        browser = "Unknown browser"
    return {
        "browser": browser,
        "device_label": device_label,
        "operating_system": operating_system,
    }


def _build_storefront_customer_token_pair(*, customer, session) -> dict:
    refresh = RefreshToken()
    refresh["aud"] = STOREFRONT_CUSTOMER_AUDIENCE
    refresh["customer_id"] = str(customer.id)
    refresh["business_id"] = str(customer.business_id)
    refresh["session_id"] = str(session.id)
    refresh["session_family_id"] = str(session.family_id)

    remaining_lifetime = session.expires_at - timezone.now()
    refresh.set_exp(lifetime=remaining_lifetime)

    access = refresh.access_token
    return {
        "access": str(access),
        "refresh": str(refresh),
        "token_type": "Bearer",
        "access_expires_at": datetime.fromtimestamp(
            access["exp"],
            tz=datetime_timezone.utc,
        ),
        "refresh_expires_at": session.expires_at,
        "session_id": str(session.id),
        "refresh_jti": UUID(str(refresh["jti"])),
    }


def decode_storefront_customer_refresh_token(raw_token: str) -> dict:
    if not raw_token:
        raise RefreshTokenInvalid()

    try:
        token = UntypedToken(raw_token)
        if token.get("token_type") != "refresh":
            raise RefreshTokenInvalid()
        if token.get("aud") != STOREFRONT_CUSTOMER_AUDIENCE:
            raise RefreshTokenInvalid()
        return {
            "session_id": UUID(str(token["session_id"])),
            "customer_id": str(token["customer_id"]),
            "business_id": str(token["business_id"]),
            "jti": UUID(str(token["jti"])),
        }
    except (KeyError, TypeError, ValueError, TokenError) as exc:
        raise RefreshTokenInvalid() from exc


@transaction.atomic
def issue_storefront_customer_token_pair(
    *,
    customer: StorefrontCustomer,
    ip_address=None,
    user_agent="",
    device_id=None,
) -> dict:
    if not customer.is_active:
        raise ValueError("Inactive storefront customers cannot receive tokens.")
    if not customer.is_identity_verified:
        raise ValueError("Unverified storefront customers cannot receive tokens.")

    session = create_storefront_customer_session(
        customer=customer,
        expires_at=(timezone.now() + settings.SIMPLE_JWT["REFRESH_TOKEN_LIFETIME"]),
        ip_address=ip_address,
        device_id=device_id,
        user_agent_hash=_hash_user_agent(user_agent),
        **_describe_user_agent(user_agent),
    )
    tokens = _build_storefront_customer_token_pair(
        customer=customer,
        session=session,
    )
    update_storefront_customer_session_refresh(
        session=session,
        refresh_jti=tokens["refresh_jti"],
    )
    return tokens


def login_storefront_customer_with_email(
    *,
    business,
    email: str,
    password: str,
    ip_address=None,
    user_agent="",
    device_id=None,
) -> dict:
    normalized_email = email.strip().lower()
    customer = StorefrontCustomer.objects.filter(
        business=business,
        email__iexact=normalized_email,
    ).first()
    if customer is None or not customer.is_active or not customer.check_password(password):
        raise InvalidCredentials()
    if not customer.is_email_verified:
        raise EmailVerificationRequired()

    return {
        "customer": customer,
        "tokens": issue_storefront_customer_token_pair(
            customer=customer,
            ip_address=ip_address,
            user_agent=user_agent,
            device_id=device_id,
        ),
    }


def login_storefront_customer_with_phone(
    *,
    business,
    phone_number: str,
    password: str,
    ip_address=None,
    user_agent="",
    device_id=None,
) -> dict:
    normalized_phone = phone_number.strip()
    customer = StorefrontCustomer.objects.filter(
        business=business,
        phone_number=normalized_phone,
    ).first()
    if customer is None or not customer.is_active or not customer.check_password(password):
        raise InvalidCredentials()
    if not customer.is_phone_verified:
        raise PhoneVerificationRequired()

    return {
        "customer": customer,
        "tokens": issue_storefront_customer_token_pair(
            customer=customer,
            ip_address=ip_address,
            user_agent=user_agent,
            device_id=device_id,
        ),
    }


def rotate_storefront_customer_refresh_token(*, raw_refresh_token: str) -> dict:
    claims = decode_storefront_customer_refresh_token(raw_refresh_token)
    pending_exception = None
    result = None

    with transaction.atomic():
        session = get_storefront_customer_session_for_update(
            session_id=claims["session_id"],
        )
        if (
            session is None
            or str(session.customer_id) != claims["customer_id"]
            or str(session.customer.business_id) != claims["business_id"]
        ):
            raise SessionInvalid()

        if session.revoked_at is not None:
            raise SessionInvalid()

        if session.expires_at <= timezone.now():
            revoke_storefront_customer_session(
                session=session,
                reason=StorefrontCustomerSession.RevokeReason.EXPIRED,
            )
            pending_exception = SessionExpired()
        elif not session.customer.is_active:
            revoke_storefront_customer_session(
                session=session,
                reason=StorefrontCustomerSession.RevokeReason.CUSTOMER_INACTIVE,
            )
            pending_exception = SessionInvalid()
        elif session.current_refresh_jti != claims["jti"]:
            revoke_storefront_customer_session(
                session=session,
                reason=StorefrontCustomerSession.RevokeReason.REFRESH_REUSE,
            )
            pending_exception = RefreshTokenReuseDetected()
        else:
            tokens = _build_storefront_customer_token_pair(
                customer=session.customer,
                session=session,
            )
            update_storefront_customer_session_refresh(
                session=session,
                refresh_jti=tokens["refresh_jti"],
            )
            result = {
                **tokens,
                "customer": session.customer,
            }

    if pending_exception is not None:
        raise pending_exception
    return result


@transaction.atomic
def revoke_storefront_customer_refresh_session(
    *,
    raw_refresh_token: str,
    reason=StorefrontCustomerSession.RevokeReason.LOGOUT,
) -> None:
    try:
        claims = decode_storefront_customer_refresh_token(raw_refresh_token)
    except RefreshTokenInvalid:
        return

    session = get_storefront_customer_session_for_update(
        session_id=claims["session_id"],
    )
    if session is None:
        return
    if (
        str(session.customer_id) != claims["customer_id"]
        or str(session.customer.business_id) != claims["business_id"]
    ):
        return

    revoke_storefront_customer_session(
        session=session,
        reason=reason,
    )


@transaction.atomic
def revoke_all_storefront_customer_sessions(
    *,
    customer: StorefrontCustomer,
    reason=StorefrontCustomerSession.RevokeReason.LOGOUT_ALL,
) -> int:
    sessions = list(
        get_active_storefront_customer_sessions_for_update(
            customer=customer,
        )
    )
    for session in sessions:
        revoke_storefront_customer_session(
            session=session,
            reason=reason,
        )
    return len(sessions)
