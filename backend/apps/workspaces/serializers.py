from rest_framework import serializers

from .models import (
    Business,
    BusinessAccessRequest,
    BusinessControlRequest,
    BusinessInvitation,
    BusinessMembership,
)
from .policy import ASSIGNABLE_ROLES, WorkspaceRole


class BusinessSerializer(serializers.ModelSerializer):
    class Meta:
        model = Business
        fields = [
            "id",
            "name",
            "public_handle",
            "country_code",
            "workspace_type",
            "status",
            "created_at",
        ]


class BusinessDiscoverySerializer(serializers.ModelSerializer):
    class Meta:
        model = Business
        fields = ["id", "name", "public_handle", "country_code", "workspace_type"]


class BusinessDiscoveryQuerySerializer(serializers.Serializer):
    q = serializers.CharField(min_length=3, max_length=80, trim_whitespace=True)

    def validate_q(self, value):
        normalized = value.removeprefix("@").strip()
        if len(normalized) < 3:
            raise serializers.ValidationError("Enter at least 3 search characters.")
        return normalized


class BusinessCreateSerializer(serializers.Serializer):
    name = serializers.CharField(max_length=120, trim_whitespace=True)
    country_code = serializers.CharField(max_length=2, required=False, allow_blank=True)
    workspace_type = serializers.ChoiceField(choices=Business.WorkspaceType.values)

    def validate_country_code(self, value):
        return value.upper()


class MembershipSerializer(serializers.ModelSerializer):
    user_id = serializers.UUIDField(read_only=True)
    username = serializers.CharField(source="user.username", read_only=True)
    email = serializers.EmailField(source="user.email", read_only=True)
    permissions = serializers.SerializerMethodField()

    class Meta:
        model = BusinessMembership
        fields = [
            "id",
            "user_id",
            "username",
            "email",
            "role",
            "status",
            "permissions",
            "created_at",
        ]

    def get_permissions(self, instance):
        from .policy import permissions_for_role

        return sorted(
            permission.value for permission in permissions_for_role(instance.role)
        )


class InvitationSerializer(serializers.ModelSerializer):
    class Meta:
        model = BusinessInvitation
        fields = [
            "id",
            "business_id",
            "email",
            "role",
            "status",
            "expires_at",
            "created_at",
        ]


class InvitationCreateSerializer(serializers.Serializer):
    email = serializers.EmailField()
    role = serializers.ChoiceField(
        choices=sorted(role.value for role in ASSIGNABLE_ROLES)
    )


class AccessRequestSerializer(serializers.ModelSerializer):
    username = serializers.CharField(source="user.username", read_only=True)
    email = serializers.EmailField(source="user.email", read_only=True)

    class Meta:
        model = BusinessAccessRequest
        fields = [
            "id",
            "business_id",
            "user_id",
            "username",
            "email",
            "requested_role",
            "message",
            "status",
            "created_at",
        ]


class AccessRequestCreateSerializer(serializers.Serializer):
    business_id = serializers.UUIDField()
    message = serializers.CharField(max_length=300, required=False, allow_blank=True)


class AccessRequestDecisionSerializer(serializers.Serializer):
    decision = serializers.ChoiceField(choices=["approve", "reject"])
    role = serializers.ChoiceField(
        choices=[WorkspaceRole.MANAGER.value, WorkspaceRole.MEMBER.value],
        required=False,
        default=WorkspaceRole.MEMBER.value,
    )


class MembershipUpdateSerializer(serializers.Serializer):
    role = serializers.ChoiceField(
        choices=[
            WorkspaceRole.PARTNER.value,
            WorkspaceRole.ADMINISTRATOR.value,
            WorkspaceRole.MANAGER.value,
            WorkspaceRole.MEMBER.value,
        ],
        required=False,
    )
    status = serializers.ChoiceField(
        choices=[
            BusinessMembership.Status.ACTIVE,
            BusinessMembership.Status.SUSPENDED,
            BusinessMembership.Status.REMOVED,
        ],
        required=False,
    )

    def validate(self, attrs):
        if not attrs:
            raise serializers.ValidationError("Provide a role or status change.")
        return attrs


class ControlRequestSerializer(serializers.ModelSerializer):
    class Meta:
        model = BusinessControlRequest
        fields = [
            "id",
            "business_id",
            "action",
            "status",
            "initiated_by_id",
            "expires_at",
            "created_at",
        ]


class ControlRequestCreateSerializer(serializers.Serializer):
    action = serializers.ChoiceField(choices=BusinessControlRequest.Action.values)


class ControlRequestDecisionSerializer(serializers.Serializer):
    decision = serializers.ChoiceField(choices=["approve", "reject"])


class OwnershipTransferSerializer(serializers.Serializer):
    target_membership_id = serializers.UUIDField()


class EmptyActionSerializer(serializers.Serializer):
    pass
