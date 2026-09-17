from django.db.models import QuerySet
from django.utils import timezone

from ..models import StorefrontCustomer, StorefrontCustomerSession


def create_storefront_customer_session(
    *,
    customer: StorefrontCustomer,
    expires_at,
    ip_address=None,
    device_id=None,
    user_agent_hash="",
    device_label="",
    browser="",
    operating_system="",
) -> StorefrontCustomerSession:
    return StorefrontCustomerSession.objects.create(
        customer=customer,
        expires_at=expires_at,
        ip_address=ip_address,
        device_id=device_id,
        user_agent_hash=user_agent_hash,
        device_label=device_label,
        browser=browser,
        operating_system=operating_system,
    )


def get_storefront_customer_session_for_update(*, session_id):
    return (
        StorefrontCustomerSession.objects.select_for_update()
        .select_related("customer", "customer__business")
        .filter(id=session_id)
        .first()
    )


def update_storefront_customer_session_refresh(*, session, refresh_jti):
    session.current_refresh_jti = refresh_jti
    session.last_seen_at = timezone.now()
    session.save(
        update_fields=[
            "current_refresh_jti",
            "last_seen_at",
            "updated_at",
        ]
    )
    return session


def revoke_storefront_customer_session(*, session, reason):
    if session.revoked_at is None:
        session.revoked_at = timezone.now()
        session.revoke_reason = reason
        session.save(
            update_fields=[
                "revoked_at",
                "revoke_reason",
                "updated_at",
            ]
        )
    return session


def get_active_storefront_customer_sessions_for_update(
    *,
    customer: StorefrontCustomer,
) -> QuerySet:
    return StorefrontCustomerSession.objects.select_for_update().filter(
        customer=customer,
        revoked_at__isnull=True,
        expires_at__gt=timezone.now(),
    )
