from common.exceptions.modules.identity import (
    EmailAlreadyRegistered,
    InvalidCredentials,
)
from django.db import IntegrityError, transaction

from ..models import StorefrontCustomer, StorefrontCustomerExternalIdentity
from .google_authentication import (
    google_is_authoritative_for_email,
    verify_google_credential,
)
from .storefront_customer_session import issue_storefront_customer_token_pair


def _populate_profile_if_missing(*, customer: StorefrontCustomer, claims: dict) -> None:
    update_fields = []
    given_name = str(claims.get("given_name") or "").strip()[:150]
    family_name = str(claims.get("family_name") or "").strip()[:150]

    if given_name and not customer.first_name:
        customer.first_name = given_name
        update_fields.append("first_name")
    if family_name and not customer.last_name:
        customer.last_name = family_name
        update_fields.append("last_name")

    if update_fields:
        update_fields.append("updated_at")
        customer.save(update_fields=update_fields)


def _authenticate_existing_identity(*, external_identity, email: str, claims: dict):
    customer = external_identity.customer
    if customer.is_deleted or not customer.is_active:
        raise InvalidCredentials()

    if external_identity.email_snapshot != email:
        external_identity.email_snapshot = email
        external_identity.save(update_fields=["email_snapshot", "updated_at"])

    authoritative_email = google_is_authoritative_for_email(
        email=email,
        claims=claims,
    )
    if (
        authoritative_email
        and customer.email
        and customer.email.casefold() == email.casefold()
        and not customer.is_email_verified
    ):
        customer.is_email_verified = True
        customer.save(update_fields=["is_email_verified", "updated_at"])

    _populate_profile_if_missing(customer=customer, claims=claims)
    return customer


def authenticate_storefront_google_customer(
    *,
    business,
    credential: str,
    ip_address=None,
    user_agent="",
    device_id=None,
) -> dict:
    """Authenticate Google inside one merchant's storefront customer realm."""

    claims = verify_google_credential(credential)
    subject = str(claims["sub"]).strip()
    email = str(claims["email"]).strip().lower()
    provider = StorefrontCustomerExternalIdentity.Provider.GOOGLE

    external_identity = (
        StorefrontCustomerExternalIdentity.objects.select_related("customer")
        .filter(
            business=business,
            provider=provider,
            subject=subject,
        )
        .first()
    )
    if external_identity is not None:
        customer = _authenticate_existing_identity(
            external_identity=external_identity,
            email=email,
            claims=claims,
        )
    else:
        authoritative_email = google_is_authoritative_for_email(
            email=email,
            claims=claims,
        )
        existing_customer = StorefrontCustomer.objects.filter(
            business=business,
            email__iexact=email,
        ).first()
        if existing_customer is not None:
            if existing_customer.is_deleted or not existing_customer.is_active:
                raise InvalidCredentials()
            if not authoritative_email:
                raise EmailAlreadyRegistered()

        try:
            with transaction.atomic():
                if existing_customer is not None:
                    customer = StorefrontCustomer.objects.select_for_update().get(
                        pk=existing_customer.pk,
                    )
                    if not customer.is_email_verified:
                        customer.is_email_verified = True
                        customer.save(
                            update_fields=["is_email_verified", "updated_at"],
                        )
                    _populate_profile_if_missing(customer=customer, claims=claims)
                else:
                    customer = StorefrontCustomer(
                        business=business,
                        email=email,
                        first_name=str(claims.get("given_name") or "").strip()[:150],
                        last_name=str(claims.get("family_name") or "").strip()[:150],
                        is_email_verified=authoritative_email,
                    )
                    customer.set_unusable_password()
                    customer.save()

                StorefrontCustomerExternalIdentity.objects.create(
                    business=business,
                    customer=customer,
                    provider=provider,
                    subject=subject,
                    email_snapshot=email,
                )
        except IntegrityError:
            external_identity = (
                StorefrontCustomerExternalIdentity.objects.select_related("customer")
                .filter(
                    business=business,
                    provider=provider,
                    subject=subject,
                )
                .first()
            )
            if external_identity is None:
                raise
            customer = _authenticate_existing_identity(
                external_identity=external_identity,
                email=email,
                claims=claims,
            )

    return {
        "customer": customer,
        "tokens": issue_storefront_customer_token_pair(
            customer=customer,
            ip_address=ip_address,
            user_agent=user_agent,
            device_id=device_id,
        ),
    }
