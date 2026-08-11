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


def workspace_overview_state(*, membership):
    from .policy import WorkspacePermission, role_has_permission

    business = membership.business
    can_manage_invitations = role_has_permission(
        membership.role, WorkspacePermission.MANAGE_INVITATIONS
    )
    can_manage_members = role_has_permission(
        membership.role, WorkspacePermission.MANAGE_MEMBERS
    )
    can_control_business = role_has_permission(
        membership.role, WorkspacePermission.CONTROL_BUSINESS
    )
    pending_invitations = (
        business.invitations.filter(
            status=BusinessInvitation.Status.PENDING,
            expires_at__gt=timezone.now(),
        ).count()
        if can_manage_invitations
        else None
    )
    pending_access_requests = (
        business.access_requests.filter(
            status=BusinessAccessRequest.Status.PENDING
        ).count()
        if can_manage_members
        else None
    )
    pending_control_requests = (
        business.control_requests.filter(
            status="pending", expires_at__gt=timezone.now()
        ).count()
        if can_control_business
        else None
    )
    visible_pending_counts = [
        count
        for count in (
            pending_invitations,
            pending_access_requests,
            pending_control_requests,
        )
        if count is not None
    ]
    return {
        "active_member_count": business.memberships.filter(
            status=BusinessMembership.Status.ACTIVE
        ).count(),
        "pending_access_request_count": pending_access_requests,
        "pending_action_count": sum(visible_pending_counts),
        "pending_control_request_count": pending_control_requests,
        "pending_invitation_count": pending_invitations,
    }


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
