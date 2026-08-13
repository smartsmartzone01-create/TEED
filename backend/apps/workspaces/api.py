from common.responses import SuccessResponse
from django.utils.decorators import method_decorator
from django.views.decorators.csrf import csrf_protect
from rest_framework import status
from rest_framework.parsers import FormParser, JSONParser, MultiPartParser
from rest_framework.permissions import IsAuthenticated
from rest_framework.throttling import ScopedRateThrottle
from rest_framework.views import APIView

from apps.profiles.permissions import IsOnboardingComplete

from .models import BusinessMembership, BusinessProfile, BusinessSettings
from .policy import WorkspacePermission, role_has_permission
from .selectors import (
    business_profile_completion,
    business_security_state,
    discover_businesses,
    user_businesses,
    visible_access_requests,
    visible_invitations,
    workspace_overview_state,
)
from .serializers import (
    AccessRequestCreateSerializer,
    AccessRequestDecisionSerializer,
    AccessRequestSerializer,
    BusinessCreateSerializer,
    BusinessDiscoveryQuerySerializer,
    BusinessDiscoverySerializer,
    BusinessProfileSerializer,
    BusinessProfileUpdateSerializer,
    BusinessSerializer,
    BusinessSettingsSerializer,
    BusinessSettingsUpdateSerializer,
    ControlRequestCreateSerializer,
    ControlRequestDecisionSerializer,
    ControlRequestSerializer,
    EmptyActionSerializer,
    InvitationCreateSerializer,
    InvitationSerializer,
    MembershipSerializer,
    MembershipUpdateSerializer,
    OwnershipTransferSerializer,
    WorkspaceAuditEventSerializer,
)
from .services import (
    cancel_invitation,
    create_business,
    create_control_request,
    create_invitation,
    decide_access_request,
    decide_control_request,
    request_access,
    require_membership,
    resolve_invitation,
    transfer_ownership,
    update_business_profile,
    update_business_settings,
    update_membership,
)


class WorkspaceBaseAPIView(APIView):
    permission_classes = [IsAuthenticated, IsOnboardingComplete]


class BusinessListCreateAPIView(WorkspaceBaseAPIView):
    serializer_class = BusinessCreateSerializer

    def get(self, request):
        memberships = user_businesses(user=request.user)
        return SuccessResponse(
            message="Businesses retrieved successfully.",
            data={
                "businesses": [
                    {
                        **BusinessSerializer(
                            item.business, context={"request": request}
                        ).data,
                        "membership": MembershipSerializer(item).data,
                    }
                    for item in memberships
                ]
            },
        )

    @method_decorator(csrf_protect)
    def post(self, request):
        serializer = BusinessCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        business = create_business(user=request.user, **serializer.validated_data)
        return SuccessResponse(
            message="Business created successfully.",
            data=BusinessSerializer(business, context={"request": request}).data,
            status_code=status.HTTP_201_CREATED,
        )


class BusinessDiscoveryAPIView(WorkspaceBaseAPIView):
    serializer_class = BusinessDiscoveryQuerySerializer
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "workspace_discovery"

    def get(self, request):
        serializer = BusinessDiscoveryQuerySerializer(data=request.query_params)
        serializer.is_valid(raise_exception=True)
        businesses = discover_businesses(query=serializer.validated_data["q"])
        return SuccessResponse(
            message="Discoverable Businesses retrieved successfully.",
            data={
                "businesses": BusinessDiscoverySerializer(businesses, many=True).data
            },
        )


class BusinessDetailAPIView(WorkspaceBaseAPIView):
    serializer_class = BusinessSerializer

    def get(self, request, business_id):
        membership = require_membership(user=request.user, business_id=business_id)
        return SuccessResponse(
            message="Business retrieved successfully.",
            data={
                **BusinessSerializer(
                    membership.business, context={"request": request}
                ).data,
                "membership": MembershipSerializer(membership).data,
            },
        )


class BusinessOverviewAPIView(WorkspaceBaseAPIView):
    serializer_class = BusinessSerializer

    def get(self, request, business_id):
        membership = require_membership(user=request.user, business_id=business_id)
        return SuccessResponse(
            message="Business workspace overview retrieved successfully.",
            data={
                "business": BusinessSerializer(
                    membership.business, context={"request": request}
                ).data,
                "membership": MembershipSerializer(membership).data,
                "state": workspace_overview_state(membership=membership),
            },
        )


class BusinessProfileAPIView(WorkspaceBaseAPIView):
    parser_classes = [JSONParser, FormParser, MultiPartParser]

    def get(self, request, business_id):
        membership = require_membership(user=request.user, business_id=business_id)
        profile, _ = BusinessProfile.objects.get_or_create(business=membership.business)
        return SuccessResponse(
            message="Business profile retrieved successfully.",
            data={
                "business": BusinessSerializer(
                    membership.business, context={"request": request}
                ).data,
                "profile": BusinessProfileSerializer(
                    profile, context={"request": request}
                ).data,
                "completion": business_profile_completion(business=membership.business),
                "can_manage": role_has_permission(
                    membership.role, WorkspacePermission.MANAGE_BUSINESS
                ),
            },
        )

    @method_decorator(csrf_protect)
    def patch(self, request, business_id):
        serializer = BusinessProfileUpdateSerializer(data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        business, profile = update_business_profile(
            actor=request.user,
            business_id=business_id,
            **serializer.validated_data,
        )
        return SuccessResponse(
            message="Business profile updated successfully.",
            data={
                "business": BusinessSerializer(
                    business, context={"request": request}
                ).data,
                "profile": BusinessProfileSerializer(
                    profile, context={"request": request}
                ).data,
                "completion": business_profile_completion(business=business),
                "can_manage": True,
            },
        )


class BusinessSettingsAPIView(WorkspaceBaseAPIView):
    def get(self, request, business_id):
        membership = require_membership(user=request.user, business_id=business_id)
        settings_record, _ = BusinessSettings.objects.get_or_create(
            business=membership.business
        )
        return SuccessResponse(
            message="Business settings retrieved successfully.",
            data={
                "settings": BusinessSettingsSerializer(settings_record).data,
                "can_manage": role_has_permission(
                    membership.role, WorkspacePermission.MANAGE_BUSINESS
                ),
            },
        )

    @method_decorator(csrf_protect)
    def patch(self, request, business_id):
        serializer = BusinessSettingsUpdateSerializer(data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        settings_record = update_business_settings(
            actor=request.user,
            business_id=business_id,
            **serializer.validated_data,
        )
        return SuccessResponse(
            message="Business settings updated successfully.",
            data={
                "settings": BusinessSettingsSerializer(settings_record).data,
                "can_manage": True,
            },
        )


class BusinessSecurityAPIView(WorkspaceBaseAPIView):
    def get(self, request, business_id):
        membership = require_membership(
            user=request.user,
            business_id=business_id,
            allow_inactive_controllers=True,
        )
        state = business_security_state(membership=membership)
        return SuccessResponse(
            message="Business security state retrieved successfully.",
            data={
                "business": BusinessSerializer(
                    membership.business, context={"request": request}
                ).data,
                "membership": MembershipSerializer(membership).data,
                "controllers": MembershipSerializer(
                    state["controllers"], many=True
                ).data,
                "permissions": state["permissions"],
                "pending_controls": ControlRequestSerializer(
                    state["pending_controls"], many=True
                ).data,
                "recent_events": WorkspaceAuditEventSerializer(
                    state["recent_events"], many=True
                ).data,
                "can_control": role_has_permission(
                    membership.role, WorkspacePermission.CONTROL_BUSINESS
                ),
            },
        )


class MembershipListAPIView(WorkspaceBaseAPIView):
    serializer_class = MembershipSerializer

    def get(self, request, business_id):
        membership = require_membership(user=request.user, business_id=business_id)
        members = BusinessMembership.objects.select_related("user").filter(
            business=membership.business,
            status__in=[
                BusinessMembership.Status.ACTIVE,
                BusinessMembership.Status.SUSPENDED,
            ],
        )
        return SuccessResponse(
            message="Business members retrieved successfully.",
            data={"members": MembershipSerializer(members, many=True).data},
        )


@method_decorator(csrf_protect, name="dispatch")
class MembershipDetailAPIView(WorkspaceBaseAPIView):
    serializer_class = MembershipUpdateSerializer

    def patch(self, request, business_id, membership_id):
        serializer = MembershipUpdateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        membership = update_membership(
            actor=request.user,
            business_id=business_id,
            membership_id=membership_id,
            **serializer.validated_data,
        )
        return SuccessResponse(
            message="Membership updated successfully.",
            data=MembershipSerializer(membership).data,
        )


class InvitationListCreateAPIView(WorkspaceBaseAPIView):
    serializer_class = InvitationCreateSerializer

    def get(self, request, business_id):
        membership = require_membership(
            user=request.user,
            business_id=business_id,
            permission=WorkspacePermission.MANAGE_INVITATIONS,
        )
        invitations = membership.business.invitations.all()
        return SuccessResponse(
            message="Business invitations retrieved successfully.",
            data={"invitations": InvitationSerializer(invitations, many=True).data},
        )

    @method_decorator(csrf_protect)
    def post(self, request, business_id):
        serializer = InvitationCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        invitation = create_invitation(
            actor=request.user, business_id=business_id, **serializer.validated_data
        )
        return SuccessResponse(
            message="Invitation created successfully.",
            data=InvitationSerializer(invitation).data,
            status_code=status.HTTP_201_CREATED,
        )


class MyInvitationListAPIView(WorkspaceBaseAPIView):
    serializer_class = InvitationSerializer

    def get(self, request):
        invitations = visible_invitations(user=request.user)
        return SuccessResponse(
            message="Invitations retrieved successfully.",
            data={"invitations": InvitationSerializer(invitations, many=True).data},
        )


@method_decorator(csrf_protect, name="dispatch")
class InvitationDecisionAPIView(WorkspaceBaseAPIView):
    serializer_class = EmptyActionSerializer

    def post(self, request, invitation_id, decision):
        if decision not in {"accept", "decline"}:
            from rest_framework.exceptions import NotFound

            raise NotFound("Invitation action not found.")
        membership = resolve_invitation(
            user=request.user, invitation_id=invitation_id, accept=decision == "accept"
        )
        return SuccessResponse(
            message=f"Invitation {decision}ed successfully.",
            data=MembershipSerializer(membership).data if membership else None,
        )


@method_decorator(csrf_protect, name="dispatch")
class InvitationCancelAPIView(WorkspaceBaseAPIView):
    serializer_class = EmptyActionSerializer

    def post(self, request, business_id, invitation_id):
        invitation = cancel_invitation(
            actor=request.user,
            business_id=business_id,
            invitation_id=invitation_id,
        )
        return SuccessResponse(
            message="Invitation cancelled successfully.",
            data=InvitationSerializer(invitation).data,
        )


@method_decorator(csrf_protect, name="dispatch")
class AccessRequestCreateAPIView(WorkspaceBaseAPIView):
    serializer_class = AccessRequestCreateSerializer

    def post(self, request):
        serializer = AccessRequestCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        access_request = request_access(user=request.user, **serializer.validated_data)
        return SuccessResponse(
            message="Business access requested successfully.",
            data=AccessRequestSerializer(access_request).data,
            status_code=status.HTTP_201_CREATED,
        )


class BusinessAccessRequestListAPIView(WorkspaceBaseAPIView):
    serializer_class = AccessRequestSerializer

    def get(self, request, business_id):
        membership = require_membership(
            user=request.user,
            business_id=business_id,
            permission=WorkspacePermission.MANAGE_MEMBERS,
        )
        requests = visible_access_requests(business=membership.business)
        return SuccessResponse(
            message="Access requests retrieved successfully.",
            data={"access_requests": AccessRequestSerializer(requests, many=True).data},
        )


@method_decorator(csrf_protect, name="dispatch")
class AccessRequestDecisionAPIView(WorkspaceBaseAPIView):
    serializer_class = AccessRequestDecisionSerializer

    def post(self, request, business_id, request_id):
        serializer = AccessRequestDecisionSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        access_request = decide_access_request(
            actor=request.user,
            business_id=business_id,
            request_id=request_id,
            **serializer.validated_data,
        )
        return SuccessResponse(
            message=f"Access request {access_request.status} successfully.",
            data=AccessRequestSerializer(access_request).data,
        )


@method_decorator(csrf_protect, name="dispatch")
class ControlRequestCreateAPIView(WorkspaceBaseAPIView):
    serializer_class = ControlRequestCreateSerializer

    def post(self, request, business_id):
        serializer = ControlRequestCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        control_request = create_control_request(
            actor=request.user, business_id=business_id, **serializer.validated_data
        )
        return SuccessResponse(
            message="Business control request created successfully.",
            data=ControlRequestSerializer(control_request).data,
            status_code=status.HTTP_201_CREATED,
        )


@method_decorator(csrf_protect, name="dispatch")
class ControlRequestDecisionAPIView(WorkspaceBaseAPIView):
    serializer_class = ControlRequestDecisionSerializer

    def post(self, request, business_id, control_request_id):
        serializer = ControlRequestDecisionSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        control_request = decide_control_request(
            actor=request.user,
            business_id=business_id,
            control_request_id=control_request_id,
            **serializer.validated_data,
        )
        return SuccessResponse(
            message=f"Business control request {control_request.status}.",
            data=ControlRequestSerializer(control_request).data,
        )


@method_decorator(csrf_protect, name="dispatch")
class OwnershipTransferAPIView(WorkspaceBaseAPIView):
    serializer_class = OwnershipTransferSerializer

    def post(self, request, business_id):
        serializer = OwnershipTransferSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        membership = transfer_ownership(
            actor=request.user, business_id=business_id, **serializer.validated_data
        )
        return SuccessResponse(
            message="Business ownership transferred successfully.",
            data=MembershipSerializer(membership).data,
        )
