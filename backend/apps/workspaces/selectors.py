from uuid import UUID

from django.db.models import Q
from django.utils import timezone

from .models import (
    Business,
    BusinessAccessRequest,
    BusinessControlRequest,
    BusinessInvitation,
    BusinessMembership,
    BusinessProfile,
    BusinessSettings,
)


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
    queryset = BusinessMembership.objects.select_related(
        "business", "business__profile"
    ).filter(
        user=user,
        status=BusinessMembership.Status.ACTIVE,
        business__deleted_at__isnull=True,
    )
    return queryset.filter(
        Q(business__status__in=[Business.Status.ACTIVE, Business.Status.DISABLED])
        | Q(
            business__status=Business.Status.DELETION_PENDING,
            role__in=["owner", "partner"],
        )
    )


def discover_businesses(*, query):
    normalized = query.strip().removeprefix("@")
    identity_query = Q(name__icontains=normalized) | Q(
        public_handle__istartswith=normalized
    )
    try:
        identity_query |= Q(id=UUID(normalized))
    except ValueError:
        pass
    return Business.objects.filter(
        identity_query,
        is_discoverable=True,
        status=Business.Status.ACTIVE,
    ).exclude(workspace_type=Business.WorkspaceType.PERSONAL_BRAND)[:10]


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
    completion = business_profile_completion(business=business)
    settings_record, _ = BusinessSettings.objects.get_or_create(business=business)
    profile, _ = BusinessProfile.objects.get_or_create(business=business)
    return {
        "active_member_count": business.memberships.filter(
            status=BusinessMembership.Status.ACTIVE
        ).count(),
        "pending_access_request_count": pending_access_requests,
        "pending_action_count": sum(visible_pending_counts),
        "pending_control_request_count": pending_control_requests,
        "pending_invitation_count": pending_invitations,
        "profile_completion_percentage": completion["percentage"],
        "profile_missing_fields": completion["missing_fields"],
        "is_discoverable": business.is_discoverable,
        "branding_enabled": settings_record.branding_enabled,
        "brand_configured": bool(
            profile.primary_brand_color and profile.secondary_brand_color
        ),
    }


def business_profile_completion(*, business):
    profile, _ = BusinessProfile.objects.get_or_create(business=business)
    values = {
        "name": business.name,
        "country_code": business.country_code,
        "workspace_type": business.workspace_type,
        "business_category": profile.business_category,
        "operating_model": profile.operating_model,
        "city": profile.city,
    }
    missing_fields = [key for key, value in values.items() if not value]
    completed = len(values) - len(missing_fields)
    return {
        "completed_fields": completed,
        "missing_fields": missing_fields,
        "percentage": round(completed / len(values) * 100),
        "total_fields": len(values),
    }


def business_security_state(*, membership):
    from .policy import permissions_for_role

    business = membership.business
    controllers = business.memberships.select_related("user").filter(
        role__in=["owner", "partner"],
        status=BusinessMembership.Status.ACTIVE,
    )
    pending_controls = business.control_requests.select_related(
        "initiated_by", "resolved_by"
    ).filter(
        status=BusinessControlRequest.Status.PENDING,
        expires_at__gt=timezone.now(),
    )
    return {
        "controllers": controllers,
        "permissions": sorted(
            permission.value for permission in permissions_for_role(membership.role)
        ),
        "pending_controls": pending_controls,
        "recent_events": business.audit_events.select_related("actor")[:20],
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
