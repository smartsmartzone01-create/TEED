from datetime import timedelta

from django.contrib.auth import get_user_model
from django.db import transaction
from django.utils import timezone
from rest_framework.exceptions import NotFound, PermissionDenied, ValidationError

from apps.notifications.models import UserNotification
from apps.notifications.services import notify_user

from .models import (
    Business,
    BusinessAccessRequest,
    BusinessControlRequest,
    BusinessInvitation,
    BusinessMembership,
    WorkspaceAuditEvent,
)
from .policy import (
    PROTECTED_ROLES,
    WorkspacePermission,
    WorkspaceRole,
    role_has_permission,
)
from .selectors import active_membership


def audit(*, business, actor, event_type, target_id=None, metadata=None):
    return WorkspaceAuditEvent.objects.create(
        business=business,
        actor=actor,
        event_type=event_type,
        target_id=target_id,
        metadata=metadata or {},
    )


def require_membership(*, user, business_id, permission=WorkspacePermission.ACCESS):
    membership = active_membership(user=user, business_id=business_id)
    if membership is None:
        raise NotFound("Business not found.", code="business_not_found")
    if not role_has_permission(membership.role, permission):
        raise PermissionDenied(
            "You do not have permission to perform this action.",
            code="workspace_permission_denied",
        )
    if (
        permission != WorkspacePermission.CONTROL_BUSINESS
        and membership.business.status != Business.Status.ACTIVE
    ):
        raise PermissionDenied(
            "This Business is not currently active.", code="business_inactive"
        )
    return membership


@transaction.atomic
def create_business(*, user, name, country_code=""):
    business = Business.objects.create(
        name=name.strip(), country_code=country_code, created_by=user
    )
    BusinessMembership.objects.create(
        business=business,
        user=user,
        role=WorkspaceRole.OWNER.value,
        status=BusinessMembership.Status.ACTIVE,
    )
    audit(
        business=business,
        actor=user,
        event_type="business.created",
        target_id=business.id,
    )
    return business


def _roles_actor_can_assign(actor_role):
    if actor_role in {WorkspaceRole.OWNER.value, WorkspaceRole.PARTNER.value}:
        return {
            WorkspaceRole.PARTNER.value,
            WorkspaceRole.ADMINISTRATOR.value,
            WorkspaceRole.MANAGER.value,
            WorkspaceRole.MEMBER.value,
        }
    if actor_role == WorkspaceRole.ADMINISTRATOR.value:
        return {WorkspaceRole.MANAGER.value, WorkspaceRole.MEMBER.value}
    if actor_role == WorkspaceRole.MANAGER.value:
        return {WorkspaceRole.MEMBER.value}
    return set()


@transaction.atomic
def create_invitation(*, actor, business_id, email, role):
    actor_membership = require_membership(
        user=actor,
        business_id=business_id,
        permission=WorkspacePermission.MANAGE_INVITATIONS,
    )
    if role not in _roles_actor_can_assign(actor_membership.role):
        raise PermissionDenied(
            "You cannot assign this role.", code="role_assignment_denied"
        )
    email = email.strip().lower()
    if BusinessMembership.objects.filter(
        business=actor_membership.business,
        user__email__iexact=email,
        status=BusinessMembership.Status.ACTIVE,
    ).exists():
        raise ValidationError({"email": "This user is already a Business member."})
    invitation, created = BusinessInvitation.objects.get_or_create(
        business=actor_membership.business,
        email=email,
        status=BusinessInvitation.Status.PENDING,
        defaults={
            "role": role,
            "invited_by": actor,
            "expires_at": timezone.now() + timedelta(days=7),
        },
    )
    if not created:
        raise ValidationError({"email": "A pending invitation already exists."})
    invited_user = get_user_model().objects.filter(email__iexact=email).first()
    if invited_user:
        notify_user(
            user=invited_user,
            category=UserNotification.Category.WORKSPACE,
            template=UserNotification.Template.WORKSPACE_INVITATION,
            context={"workspace_name": invitation.business.name, "role": role},
            action_path="/dashboard/workspaces",
            deduplication_key=f"workspace-invitation:{invitation.id}",
            expires_at=invitation.expires_at,
        )
    audit(
        business=invitation.business,
        actor=actor,
        event_type="invitation.created",
        target_id=invitation.id,
        metadata={"role": role},
    )
    return invitation


@transaction.atomic
def resolve_invitation(*, user, invitation_id, accept):
    invitation = (
        BusinessInvitation.objects.select_for_update()
        .select_related("business")
        .filter(
            id=invitation_id,
            email__iexact=user.email,
            status=BusinessInvitation.Status.PENDING,
        )
        .first()
    )
    if invitation is None:
        raise NotFound("Invitation not found.", code="invitation_not_found")
    if invitation.expires_at <= timezone.now():
        invitation.status = BusinessInvitation.Status.EXPIRED
        invitation.resolved_at = timezone.now()
        invitation.save(update_fields=["status", "resolved_at", "updated_at"])
        raise ValidationError("This invitation has expired.", code="invitation_expired")
    invitation.status = (
        BusinessInvitation.Status.ACCEPTED
        if accept
        else BusinessInvitation.Status.DECLINED
    )
    invitation.resolved_at = timezone.now()
    invitation.save(update_fields=["status", "resolved_at", "updated_at"])
    if accept:
        membership, _ = BusinessMembership.objects.update_or_create(
            business=invitation.business,
            user=user,
            defaults={
                "role": invitation.role,
                "status": BusinessMembership.Status.ACTIVE,
            },
        )
    else:
        membership = None
    audit(
        business=invitation.business,
        actor=user,
        event_type="invitation.accepted" if accept else "invitation.declined",
        target_id=invitation.id,
    )
    return membership


@transaction.atomic
def request_access(*, user, business_id, message=""):
    business = Business.objects.filter(
        id=business_id, status=Business.Status.ACTIVE
    ).first()
    if business is None:
        raise NotFound("Business not found.", code="business_not_found")
    if BusinessMembership.objects.filter(
        business=business, user=user, status=BusinessMembership.Status.ACTIVE
    ).exists():
        raise ValidationError(
            "You already belong to this Business.", code="membership_exists"
        )
    access_request, created = BusinessAccessRequest.objects.get_or_create(
        business=business,
        user=user,
        status=BusinessAccessRequest.Status.PENDING,
        defaults={"message": message},
    )
    if not created:
        raise ValidationError(
            "A pending access request already exists.", code="access_request_exists"
        )
    audit(
        business=business,
        actor=user,
        event_type="access_request.created",
        target_id=access_request.id,
    )
    controllers = get_user_model().objects.filter(
        business_memberships__business=business,
        business_memberships__role__in=[
            WorkspaceRole.OWNER.value,
            WorkspaceRole.PARTNER.value,
            WorkspaceRole.ADMINISTRATOR.value,
        ],
        business_memberships__status=BusinessMembership.Status.ACTIVE,
    )
    for controller in controllers:
        notify_user(
            user=controller,
            category=UserNotification.Category.WORKSPACE,
            template=UserNotification.Template.WORKSPACE_ACCESS_REQUEST,
            context={"workspace_name": business.name},
            action_path="/dashboard/workspaces",
            deduplication_key=(
                f"workspace-access-request:{access_request.id}:{controller.id}"
            ),
        )
    return access_request


@transaction.atomic
def decide_access_request(*, actor, business_id, request_id, decision, role):
    actor_membership = require_membership(
        user=actor,
        business_id=business_id,
        permission=WorkspacePermission.MANAGE_MEMBERS,
    )
    if role not in _roles_actor_can_assign(actor_membership.role):
        raise PermissionDenied(
            "You cannot assign this role.", code="role_assignment_denied"
        )
    access_request = (
        BusinessAccessRequest.objects.select_for_update()
        .filter(
            id=request_id,
            business=actor_membership.business,
            status=BusinessAccessRequest.Status.PENDING,
        )
        .first()
    )
    if access_request is None:
        raise NotFound("Access request not found.", code="access_request_not_found")
    approved = decision == "approve"
    access_request.status = (
        BusinessAccessRequest.Status.APPROVED
        if approved
        else BusinessAccessRequest.Status.REJECTED
    )
    access_request.resolved_by = actor
    access_request.resolved_at = timezone.now()
    access_request.save(
        update_fields=["status", "resolved_by", "resolved_at", "updated_at"]
    )
    if approved:
        BusinessMembership.objects.update_or_create(
            business=access_request.business,
            user=access_request.user,
            defaults={"role": role, "status": BusinessMembership.Status.ACTIVE},
        )
    audit(
        business=access_request.business,
        actor=actor,
        event_type=f"access_request.{access_request.status}",
        target_id=access_request.id,
        metadata={"role": role} if approved else {},
    )
    notify_user(
        user=access_request.user,
        category=UserNotification.Category.WORKSPACE,
        template=UserNotification.Template.WORKSPACE_ACCESS_DECISION,
        context={
            "workspace_name": access_request.business.name,
            "role": role if approved else "",
        },
        action_path="/dashboard/workspaces",
        deduplication_key=f"workspace-access-decision:{access_request.id}",
    )
    return access_request


@transaction.atomic
def update_membership(*, actor, business_id, membership_id, role=None, status=None):
    actor_membership = require_membership(
        user=actor,
        business_id=business_id,
        permission=WorkspacePermission.MANAGE_MEMBERS,
    )
    target = (
        BusinessMembership.objects.select_for_update()
        .filter(id=membership_id, business=actor_membership.business)
        .first()
    )
    if target is None:
        raise NotFound("Membership not found.", code="membership_not_found")
    if target.role == WorkspaceRole.OWNER.value:
        raise PermissionDenied(
            "The Owner must use ownership transfer.", code="owner_protected"
        )
    if target.role in PROTECTED_ROLES and actor_membership.role not in {
        WorkspaceRole.OWNER.value,
        WorkspaceRole.PARTNER.value,
    }:
        raise PermissionDenied(
            "This membership is protected.", code="membership_protected"
        )
    if role and role not in _roles_actor_can_assign(actor_membership.role):
        raise PermissionDenied(
            "You cannot assign this role.", code="role_assignment_denied"
        )
    changed = []
    if role:
        target.role = role
        changed.append("role")
    if status:
        target.status = status
        changed.append("status")
    target.save(update_fields=[*changed, "updated_at"])
    audit(
        business=target.business,
        actor=actor,
        event_type="membership.updated",
        target_id=target.id,
        metadata={key: getattr(target, key) for key in changed},
    )
    return target


@transaction.atomic
def create_control_request(*, actor, business_id, action):
    actor_membership = require_membership(
        user=actor,
        business_id=business_id,
        permission=WorkspacePermission.CONTROL_BUSINESS,
    )
    if actor_membership.role not in {
        WorkspaceRole.OWNER.value,
        WorkspaceRole.PARTNER.value,
    }:
        raise PermissionDenied("Only an Owner or Partner can control a Business.")
    allowed_actions = {
        Business.Status.ACTIVE: {
            BusinessControlRequest.Action.DISABLE,
            BusinessControlRequest.Action.DELETE,
        },
        Business.Status.DISABLED: {
            BusinessControlRequest.Action.REACTIVATE,
            BusinessControlRequest.Action.DELETE,
        },
        Business.Status.DELETION_PENDING: {
            BusinessControlRequest.Action.CANCEL_DELETION,
        },
    }
    if action not in allowed_actions.get(actor_membership.business.status, set()):
        raise ValidationError(
            "This control action is not valid for the current Business state.",
            code="invalid_business_transition",
        )
    other_controller_exists = (
        BusinessMembership.objects.filter(
            business=actor_membership.business,
            role__in=[WorkspaceRole.OWNER.value, WorkspaceRole.PARTNER.value],
            status=BusinessMembership.Status.ACTIVE,
        )
        .exclude(user=actor)
        .exists()
    )
    if not other_controller_exists:
        raise ValidationError(
            "Add an active Partner before disabling or deleting this Business.",
            code="second_controller_required",
        )
    control_request, created = BusinessControlRequest.objects.get_or_create(
        business=actor_membership.business,
        action=action,
        status=BusinessControlRequest.Status.PENDING,
        defaults={
            "initiated_by": actor,
            "expires_at": timezone.now() + timedelta(hours=24),
        },
    )
    if not created:
        raise ValidationError(
            "A pending control request already exists.", code="control_request_exists"
        )
    audit(
        business=control_request.business,
        actor=actor,
        event_type=f"business.{action}.requested",
        target_id=control_request.id,
    )
    controllers = (
        get_user_model()
        .objects.filter(
            business_memberships__business=control_request.business,
            business_memberships__role__in=[
                WorkspaceRole.OWNER.value,
                WorkspaceRole.PARTNER.value,
            ],
            business_memberships__status=BusinessMembership.Status.ACTIVE,
        )
        .exclude(id=actor.id)
    )
    for controller in controllers:
        notify_user(
            user=controller,
            category=UserNotification.Category.WORKSPACE,
            template=UserNotification.Template.BUSINESS_CONTROL_REQUEST,
            context={"workspace_name": control_request.business.name},
            action_path="/dashboard/workspaces",
            deduplication_key=(
                f"business-control:{control_request.id}:{controller.id}"
            ),
            expires_at=control_request.expires_at,
        )
    return control_request


@transaction.atomic
def decide_control_request(*, actor, business_id, control_request_id, decision):
    require_membership(
        user=actor,
        business_id=business_id,
        permission=WorkspacePermission.CONTROL_BUSINESS,
    )
    control_request = (
        BusinessControlRequest.objects.select_for_update()
        .select_related("business")
        .filter(
            id=control_request_id,
            business_id=business_id,
            status=BusinessControlRequest.Status.PENDING,
        )
        .first()
    )
    if control_request is None:
        raise NotFound("Control request not found.", code="control_request_not_found")
    if control_request.initiated_by_id == actor.id:
        raise PermissionDenied(
            "The initiator cannot approve their own request.",
            code="independent_approval_required",
        )
    if control_request.expires_at <= timezone.now():
        control_request.status = BusinessControlRequest.Status.EXPIRED
        control_request.save(update_fields=["status", "updated_at"])
        raise ValidationError(
            "This control request has expired.", code="control_request_expired"
        )
    approved = decision == "approve"
    control_request.status = (
        BusinessControlRequest.Status.APPROVED
        if approved
        else BusinessControlRequest.Status.REJECTED
    )
    control_request.resolved_by = actor
    control_request.resolved_at = timezone.now()
    control_request.save(
        update_fields=["status", "resolved_by", "resolved_at", "updated_at"]
    )
    if approved:
        business = control_request.business
        if control_request.action == BusinessControlRequest.Action.DISABLE:
            business.status = Business.Status.DISABLED
        elif control_request.action == BusinessControlRequest.Action.REACTIVATE:
            business.status = Business.Status.ACTIVE
        elif control_request.action == BusinessControlRequest.Action.DELETE:
            business.status = Business.Status.DELETION_PENDING
        else:
            business.status = Business.Status.ACTIVE
        business.save(update_fields=["status", "updated_at"])
    audit(
        business=control_request.business,
        actor=actor,
        event_type=f"business.{control_request.action}.{control_request.status}",
        target_id=control_request.id,
    )
    notify_user(
        user=control_request.initiated_by,
        category=UserNotification.Category.WORKSPACE,
        template=UserNotification.Template.BUSINESS_CONTROL_DECISION,
        context={"workspace_name": control_request.business.name},
        action_path="/dashboard/workspaces",
        deduplication_key=f"business-control-decision:{control_request.id}",
    )
    return control_request


@transaction.atomic
def transfer_ownership(*, actor, business_id, target_membership_id):
    owner = require_membership(
        user=actor,
        business_id=business_id,
        permission=WorkspacePermission.TRANSFER_OWNERSHIP,
    )
    if owner.role != WorkspaceRole.OWNER.value:
        raise PermissionDenied(
            "Only the current Owner can transfer ownership.", code="owner_required"
        )
    target = (
        BusinessMembership.objects.select_for_update()
        .filter(
            id=target_membership_id,
            business=owner.business,
            role=WorkspaceRole.PARTNER.value,
            status=BusinessMembership.Status.ACTIVE,
        )
        .first()
    )
    if target is None:
        raise ValidationError("Ownership can only be transferred to an active Partner.")
    owner.role = WorkspaceRole.PARTNER.value
    owner.save(update_fields=["role", "updated_at"])
    target.role = WorkspaceRole.OWNER.value
    target.save(update_fields=["role", "updated_at"])
    audit(
        business=owner.business,
        actor=actor,
        event_type="ownership.transferred",
        target_id=target.id,
    )
    return target
