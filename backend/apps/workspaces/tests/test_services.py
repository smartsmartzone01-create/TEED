from common.exceptions.modules import (
    PersonalWorkspaceMembershipRestricted,
    WorkspaceAccessRequestCooldown,
    WorkspaceAccessRequestPending,
    WorkspaceMembershipExists,
)
from django.test import TestCase
from django.utils import timezone
from rest_framework.exceptions import PermissionDenied, ValidationError

from ..models import (
    Business,
    BusinessAccessRequest,
    BusinessMembership,
    WorkspaceAuditEvent,
)
from ..policy import WorkspaceRole
from ..services import (
    create_business,
    create_control_request,
    create_invitation,
    decide_access_request,
    decide_control_request,
    request_access,
    transfer_ownership,
    update_membership,
)
from .factories import create_user


class WorkspaceServiceTests(TestCase):
    def setUp(self):
        self.owner = create_user("owner@example.com")
        self.partner = create_user("partner@example.com")
        self.member = create_user("member@example.com")
        self.business = create_business(
            user=self.owner, name="TEED Shop", country_code="TZ"
        )

    def test_business_creation_atomically_bootstraps_owner_and_audit(self):
        membership = BusinessMembership.objects.get(business=self.business)
        self.assertEqual(membership.user, self.owner)
        self.assertEqual(membership.role, WorkspaceRole.OWNER)
        self.assertTrue(
            WorkspaceAuditEvent.objects.filter(
                business=self.business, event_type="business.created"
            ).exists()
        )

    def test_access_request_approval_creates_member(self):
        access_request = request_access(
            user=self.member, business_id=self.business.id, message="I work here."
        )
        decided = decide_access_request(
            actor=self.owner,
            business_id=self.business.id,
            request_id=access_request.id,
            decision="approve",
            role=WorkspaceRole.MEMBER,
        )
        self.assertEqual(decided.status, BusinessAccessRequest.Status.APPROVED)
        self.assertTrue(
            BusinessMembership.objects.filter(
                business=self.business,
                user=self.member,
                role=WorkspaceRole.MEMBER,
                status=BusinessMembership.Status.ACTIVE,
            ).exists()
        )

    def test_duplicate_pending_access_request_is_rejected(self):
        request_access(user=self.member, business_id=self.business.id)
        with self.assertRaises(WorkspaceAccessRequestPending):
            request_access(user=self.member, business_id=self.business.id)

    def test_existing_member_cannot_request_access(self):
        with self.assertRaises(WorkspaceMembershipExists):
            request_access(user=self.owner, business_id=self.business.id)

    def test_recently_rejected_request_observes_retry_cooldown(self):
        access_request = request_access(user=self.member, business_id=self.business.id)
        access_request.status = BusinessAccessRequest.Status.REJECTED
        access_request.resolved_at = timezone.now()
        access_request.save(update_fields=["status", "resolved_at", "updated_at"])

        with self.assertRaises(WorkspaceAccessRequestCooldown):
            request_access(user=self.member, business_id=self.business.id)

    def test_personal_workspace_rejects_multi_user_membership(self):
        personal = create_business(
            user=self.owner,
            name="My private workspace",
            country_code="TZ",
            workspace_type=Business.WorkspaceType.PERSONAL,
        )

        with self.assertRaises(PersonalWorkspaceMembershipRestricted):
            request_access(user=self.member, business_id=personal.id)
        with self.assertRaises(PersonalWorkspaceMembershipRestricted):
            create_invitation(
                actor=self.owner,
                business_id=personal.id,
                email="invitee@example.com",
                role=WorkspaceRole.MEMBER,
            )

    def test_manager_can_invite_only_members(self):
        manager = BusinessMembership.objects.create(
            business=self.business,
            user=self.member,
            role=WorkspaceRole.MANAGER,
            status=BusinessMembership.Status.ACTIVE,
        )
        invitation = create_invitation(
            actor=self.member,
            business_id=self.business.id,
            email="invitee@example.com",
            role=WorkspaceRole.MEMBER,
        )
        self.assertEqual(invitation.role, WorkspaceRole.MEMBER)
        with self.assertRaises(PermissionDenied):
            create_invitation(
                actor=manager.user,
                business_id=self.business.id,
                email="admin@example.com",
                role=WorkspaceRole.ADMINISTRATOR,
            )

    def test_owner_membership_cannot_be_changed_directly(self):
        owner_membership = BusinessMembership.objects.get(
            business=self.business, user=self.owner
        )
        with self.assertRaises(PermissionDenied):
            update_membership(
                actor=self.owner,
                business_id=self.business.id,
                membership_id=owner_membership.id,
                status=BusinessMembership.Status.REMOVED,
            )

    def test_destructive_control_requires_another_controller(self):
        with self.assertRaises(ValidationError):
            create_control_request(
                actor=self.owner,
                business_id=self.business.id,
                action="disable",
            )

    def test_initiator_cannot_self_approve_business_disable(self):
        BusinessMembership.objects.create(
            business=self.business,
            user=self.partner,
            role=WorkspaceRole.PARTNER,
            status=BusinessMembership.Status.ACTIVE,
        )
        control = create_control_request(
            actor=self.owner, business_id=self.business.id, action="disable"
        )
        with self.assertRaises(PermissionDenied):
            decide_control_request(
                actor=self.owner,
                business_id=self.business.id,
                control_request_id=control.id,
                decision="approve",
            )

    def test_partner_approval_disables_business(self):
        BusinessMembership.objects.create(
            business=self.business,
            user=self.partner,
            role=WorkspaceRole.PARTNER,
            status=BusinessMembership.Status.ACTIVE,
        )
        control = create_control_request(
            actor=self.owner, business_id=self.business.id, action="disable"
        )
        decide_control_request(
            actor=self.partner,
            business_id=self.business.id,
            control_request_id=control.id,
            decision="approve",
        )
        self.business.refresh_from_db()
        self.assertEqual(self.business.status, Business.Status.DISABLED)

    def test_business_control_rejects_invalid_state_transition(self):
        BusinessMembership.objects.create(
            business=self.business,
            user=self.partner,
            role=WorkspaceRole.PARTNER,
            status=BusinessMembership.Status.ACTIVE,
        )
        with self.assertRaises(ValidationError):
            create_control_request(
                actor=self.owner,
                business_id=self.business.id,
                action="reactivate",
            )

    def test_ownership_transfer_accepts_only_active_partner(self):
        partner_membership = BusinessMembership.objects.create(
            business=self.business,
            user=self.partner,
            role=WorkspaceRole.PARTNER,
            status=BusinessMembership.Status.ACTIVE,
        )
        transfer_ownership(
            actor=self.owner,
            business_id=self.business.id,
            target_membership_id=partner_membership.id,
        )
        partner_membership.refresh_from_db()
        self.assertEqual(partner_membership.role, WorkspaceRole.OWNER)
        self.assertEqual(
            BusinessMembership.objects.get(
                business=self.business, user=self.owner
            ).role,
            WorkspaceRole.PARTNER,
        )
