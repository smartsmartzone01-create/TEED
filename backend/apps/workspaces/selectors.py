from django.db.models import Q
from django.utils import timezone

from .models import BusinessAccessRequest, BusinessInvitation, BusinessMembership


def active_membership(*, user, business_id):
    return (
        BusinessMembership.objects.select_related("business", "user")
        .filter(
            user=user,
            business_id=business_id,
            status=BusinessMembership.Status.ACTIVE,
        )
        .first()
    )


def user_businesses(*, user):
    return BusinessMembership.objects.select_related("business").filter(
        user=user,
        status=BusinessMembership.Status.ACTIVE,
    )


def visible_invitations(*, user):
    if not user.email:
        return BusinessInvitation.objects.none()
    return BusinessInvitation.objects.select_related("business").filter(
        email__iexact=user.email,
        status=BusinessInvitation.Status.PENDING,
        expires_at__gt=timezone.now(),
    )


def visible_access_requests(*, business):
    return BusinessAccessRequest.objects.select_related("user").filter(
        business=business, status=BusinessAccessRequest.Status.PENDING
    )


def membership_for_user_or_email(*, business, email):
    return (
        BusinessMembership.objects.filter(
            business=business,
        )
        .filter(Q(user__email__iexact=email))
        .first()
    )
