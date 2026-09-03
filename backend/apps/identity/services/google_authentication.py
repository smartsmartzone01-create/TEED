import re

from common.exceptions.modules.identity import (
    EmailAlreadyRegistered,
    InvalidCredentials,
)
from decouple import AutoConfig
from django.conf import settings
from django.db import IntegrityError, transaction
from google.auth.exceptions import GoogleAuthError
from google.auth.transport.requests import Request as GoogleRequest
from google.oauth2 import id_token

from ..models import ExternalIdentity, IdentitySecurityEvent, User
from ..repositories import (
    create_external_identity,
    create_user,
    mark_user_email_verified,
    update_external_identity_email_snapshot,
)
from ..selectors import get_external_identity, get_user_by_email
from .authentication import authenticated_login_result
from .security_event import record_identity_security_event


def _google_client_id() -> str:
    config = AutoConfig(search_path=settings.BASE_DIR.parent)
    return config("GOOGLE_CLIENT_ID", default="").strip()


def _verify_google_credential(credential: str) -> dict:
    client_id = _google_client_id()
    if not client_id:
        raise RuntimeError("GOOGLE_CLIENT_ID is not configured.")

    try:
        claims = id_token.verify_oauth2_token(
            credential,
            GoogleRequest(),
            client_id,
        )
    except (GoogleAuthError, ValueError) as exc:
        raise InvalidCredentials() from exc

    subject = str(claims.get("sub") or "").strip()
    email = str(claims.get("email") or "").strip().lower()
    if not subject or not email:
        raise InvalidCredentials()
    return claims


def _google_is_authoritative_for_email(*, email: str, claims: dict) -> bool:
    if not claims.get("email_verified"):
        return False
    return email.endswith("@gmail.com") or bool(claims.get("hd"))


def _populate_profile_if_missing(*, user: User, claims: dict) -> User:
    update_fields = []
    given_name = str(claims.get("given_name") or "").strip()[:150]
    family_name = str(claims.get("family_name") or "").strip()[:150]

    if given_name and not user.first_name:
        user.first_name = given_name
        update_fields.append("first_name")
    if family_name and not user.last_name:
        user.last_name = family_name
        update_fields.append("last_name")

    if update_fields:
        update_fields.append("updated_at")
        user.save(update_fields=update_fields)
    return user


def _username_is_available(*, user: User, username: str) -> bool:
    return not (
        User.all_objects.filter(username__iexact=username)
        .exclude(id=user.id)
        .exists()
    )


def _suggest_username(*, user: User, email: str, claims: dict) -> str:
    if user.username:
        return user.username

    name_seed = "".join(
        [
            str(claims.get("given_name") or ""),
            str(claims.get("family_name") or ""),
        ]
    )
    email_seed = email.split("@", 1)[0]
    base = re.sub(r"[^A-Za-z0-9_]", "", name_seed).lower()
    if not base:
        base = re.sub(r"[^A-Za-z0-9_]", "", email_seed).lower()
    if len(base) < 3:
        base = f"{base}user"
    base = (base or "user")[:30]

    if _username_is_available(user=user, username=base):
        return base

    suffix = 2
    while True:
        suffix_text = str(suffix)
        candidate = f"{base[: 30 - len(suffix_text)]}{suffix_text}"
        if _username_is_available(user=user, username=candidate):
            return candidate
        suffix += 1


def _reject_google_login(
    *,
    user,
    identifier: str,
    reason: str,
    ip_address,
    user_agent: str,
    device_id,
):
    record_identity_security_event(
        user=user,
        identifier=identifier,
        event_type=IdentitySecurityEvent.EventType.LOGIN_FAILED,
        outcome=IdentitySecurityEvent.Outcome.FAILURE,
        ip_address=ip_address,
        user_agent=user_agent,
        device_id=device_id,
        metadata={"reason": reason, "channel": "google"},
    )
    raise InvalidCredentials()


def authenticate_google_user(
    *,
    credential: str,
    ip_address=None,
    user_agent="",
    device_id=None,
) -> dict:
    try:
        claims = _verify_google_credential(credential)
    except InvalidCredentials:
        _reject_google_login(
            user=None,
            identifier="google",
            reason="invalid_google_credential",
            ip_address=ip_address,
            user_agent=user_agent,
            device_id=device_id,
        )

    subject = str(claims["sub"]).strip()
    email = str(claims["email"]).strip().lower()
    provider = ExternalIdentity.Provider.GOOGLE
    authoritative_email = _google_is_authoritative_for_email(
        email=email,
        claims=claims,
    )

    external_identity = get_external_identity(
        provider=provider,
        subject=subject,
    )
    if external_identity is not None:
        user = external_identity.user
        if user.is_deleted or not user.is_active:
            _reject_google_login(
                user=user,
                identifier=email,
                reason="inactive_account",
                ip_address=ip_address,
                user_agent=user_agent,
                device_id=device_id,
            )
        update_external_identity_email_snapshot(
            external_identity=external_identity,
            email_snapshot=email,
        )
        if (
            authoritative_email
            and user.email
            and user.email.casefold() == email.casefold()
            and not user.is_email_verified
        ):
            mark_user_email_verified(user=user)
        _populate_profile_if_missing(user=user, claims=claims)
    else:
        existing_user = get_user_by_email(email=email)
        if existing_user is not None:
            if not existing_user.is_active:
                _reject_google_login(
                    user=existing_user,
                    identifier=email,
                    reason="inactive_account",
                    ip_address=ip_address,
                    user_agent=user_agent,
                    device_id=device_id,
                )
            if not authoritative_email:
                raise EmailAlreadyRegistered()

        try:
            with transaction.atomic():
                if existing_user is not None:
                    user = existing_user
                    if not user.is_email_verified:
                        mark_user_email_verified(user=user)
                    _populate_profile_if_missing(user=user, claims=claims)
                else:
                    user = create_user(
                        email=email,
                        password=None,
                        first_name=str(claims.get("given_name") or "").strip()[:150],
                        last_name=str(claims.get("family_name") or "").strip()[:150],
                        is_email_verified=authoritative_email,
                    )
                    record_identity_security_event(
                        user=user,
                        identifier=email,
                        event_type=IdentitySecurityEvent.EventType.REGISTRATION_SUCCEEDED,
                        outcome=IdentitySecurityEvent.Outcome.SUCCESS,
                        ip_address=ip_address,
                        user_agent=user_agent,
                        device_id=device_id,
                        metadata={
                            "channel": "google",
                            "email_authoritative": authoritative_email,
                        },
                    )

                create_external_identity(
                    user=user,
                    provider=provider,
                    subject=subject,
                    email_snapshot=email,
                )
        except IntegrityError:
            external_identity = get_external_identity(
                provider=provider,
                subject=subject,
            )
            if external_identity is None:
                raise
            user = external_identity.user
            if user.is_deleted or not user.is_active:
                _reject_google_login(
                    user=user,
                    identifier=email,
                    reason="inactive_account",
                    ip_address=ip_address,
                    user_agent=user_agent,
                    device_id=device_id,
                )
            update_external_identity_email_snapshot(
                external_identity=external_identity,
                email_snapshot=email,
            )
            if (
                authoritative_email
                and user.email
                and user.email.casefold() == email.casefold()
                and not user.is_email_verified
            ):
                mark_user_email_verified(user=user)
            _populate_profile_if_missing(user=user, claims=claims)

    result = authenticated_login_result(
        user=user,
        identifier=email,
        ip_address=ip_address,
        user_agent=user_agent,
        device_id=device_id,
    )
    result["suggested_username"] = _suggest_username(
        user=user,
        email=email,
        claims=claims,
    )
    return result
