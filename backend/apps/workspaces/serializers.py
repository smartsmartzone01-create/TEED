from django.core.validators import RegexValidator
from rest_framework import serializers

from .business.capabilities import capabilities_for_workspace_type
from .models import (
    Business,
    BusinessAccessRequest,
    BusinessControlRequest,
    BusinessInvitation,
    BusinessMembership,
    BusinessProfile,
    BusinessSettings,
    WorkspaceAuditEvent,
)
from .policy import ASSIGNABLE_ROLES, WorkspaceRole


class BusinessSerializer(serializers.ModelSerializer):
    capabilities = serializers.SerializerMethodField()
    logo_url = serializers.SerializerMethodField()
    primary_brand_color = serializers.CharField(
        source="profile.primary_brand_color", read_only=True
    )
    secondary_brand_color = serializers.CharField(
        source="profile.secondary_brand_color", read_only=True
    )

    class Meta:
        model = Business
        fields = [
            "id",
            "name",
            "public_handle",
            "country_code",
            "workspace_type",
            "capabilities",
            "logo_url",
            "primary_brand_color",
            "secondary_brand_color",
            "status",
            "created_at",
        ]

    def get_capabilities(self, instance):
        return sorted(capabilities_for_workspace_type(instance.workspace_type))

    def get_logo_url(self, instance):
        profile = getattr(instance, "profile", None)
        if not profile or not profile.logo:
            return None
        request = self.context.get("request")
        return (
            request.build_absolute_uri(profile.logo.url)
            if request
            else profile.logo.url
        )


class BusinessDiscoverySerializer(serializers.ModelSerializer):
    class Meta:
        model = Business
        fields = ["id", "name", "public_handle", "country_code", "workspace_type"]


class BusinessDiscoveryQuerySerializer(serializers.Serializer):
    q = serializers.CharField(min_length=1, max_length=80, trim_whitespace=True)

    def validate_q(self, value):
        normalized = value.removeprefix("@").strip()
        if not normalized:
            raise serializers.ValidationError("Enter a Business name, handle, or UUID.")
        return normalized


class BusinessCreateSerializer(serializers.Serializer):
    name = serializers.CharField(max_length=120, trim_whitespace=True)
    country_code = serializers.CharField(max_length=2, required=False, allow_blank=True)
    workspace_type = serializers.ChoiceField(choices=Business.WorkspaceType.values)

    def validate_country_code(self, value):
        return value.upper()


hex_color_validator = RegexValidator(
    regex=r"^#[0-9A-Fa-f]{6}$",
    message="Enter a color in #RRGGBB format.",
    code="invalid_hex_color",
)


class BusinessProfileSerializer(serializers.ModelSerializer):
    logo_url = serializers.SerializerMethodField()

    class Meta:
        model = BusinessProfile
        fields = [
            "logo_url",
            "business_category",
            "operating_model",
            "region",
            "city",
            "address",
            "primary_brand_color",
            "secondary_brand_color",
            "updated_at",
        ]

    def get_logo_url(self, instance):
        if not instance.logo:
            return None
        request = self.context.get("request")
        return (
            request.build_absolute_uri(instance.logo.url)
            if request
            else instance.logo.url
        )


class BusinessProfileUpdateSerializer(serializers.Serializer):
    name = serializers.CharField(max_length=120, trim_whitespace=True, required=False)
    public_handle = serializers.SlugField(max_length=80, required=False)
    workspace_type = serializers.ChoiceField(
        choices=Business.WorkspaceType.values, required=False
    )
    country_code = serializers.CharField(max_length=2, required=False)
    logo = serializers.ImageField(required=False, allow_null=True)
    business_category = serializers.ChoiceField(
        choices=["", *BusinessProfile.BusinessCategory.values],
        required=False,
    )
    operating_model = serializers.ChoiceField(
        choices=["", *BusinessProfile.OperatingModel.values], required=False
    )
    region = serializers.CharField(max_length=80, required=False, allow_blank=True)
    city = serializers.CharField(max_length=80, required=False, allow_blank=True)
    address = serializers.CharField(max_length=160, required=False, allow_blank=True)
    primary_brand_color = serializers.CharField(
        max_length=7, validators=[hex_color_validator], required=False
    )
    secondary_brand_color = serializers.CharField(
        max_length=7, validators=[hex_color_validator], required=False
    )

    def validate_country_code(self, value):
        return value.upper()

    def validate_logo(self, value):
        if value and value.size > 5 * 1024 * 1024:
            raise serializers.ValidationError(
                "The logo must be 5 MB or smaller.", code="business_logo_too_large"
            )
        if value and value.content_type not in {
            "image/jpeg",
            "image/png",
            "image/webp",
        }:
            raise serializers.ValidationError(
                "Use a JPEG, PNG, or WebP logo.", code="business_logo_type_invalid"
            )
        return value


class BusinessSettingsSerializer(serializers.ModelSerializer):
    is_discoverable = serializers.BooleanField(source="business.is_discoverable")

    class Meta:
        model = BusinessSettings
        fields = [
            "is_discoverable",
            "language_code",
            "timezone",
            "date_format",
            "time_format",
            "branding_enabled",
            "updated_at",
        ]


class BusinessSettingsUpdateSerializer(serializers.Serializer):
    is_discoverable = serializers.BooleanField(required=False)
    language_code = serializers.ChoiceField(
        choices=BusinessSettings.Language.values, required=False
    )
    timezone = serializers.ChoiceField(
        choices=["Africa/Dar_es_Salaam", "Africa/Nairobi", "Africa/Kampala", "UTC"],
        required=False,
    )
    date_format = serializers.ChoiceField(
        choices=BusinessSettings.DateFormat.values, required=False
    )
    time_format = serializers.ChoiceField(
        choices=BusinessSettings.TimeFormat.values, required=False
    )
    branding_enabled = serializers.BooleanField(required=False)


class WorkspaceAuditEventSerializer(serializers.ModelSerializer):
    actor_email = serializers.EmailField(source="actor.email", read_only=True)

    class Meta:
        model = WorkspaceAuditEvent
        fields = [
            "id",
            "event_type",
            "actor_email",
            "target_id",
            "metadata",
            "created_at",
        ]


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
        choices=sorted(role.value for role in ASSIGNABLE_ROLES),
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
