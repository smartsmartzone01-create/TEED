from common.localization import SUPPORTED_COUNTRY_CHOICES
from rest_framework import serializers


class EmptyProfileActionSerializer(serializers.Serializer):
    """Empty request contract for profile actions."""


class ProfileCompletionSerializer(serializers.Serializer):
    percentage = serializers.IntegerField(read_only=True)
    completed_fields = serializers.IntegerField(read_only=True)
    total_required_fields = serializers.IntegerField(read_only=True)


class VerifiedContactsSerializer(serializers.Serializer):
    email = serializers.BooleanField(read_only=True)
    phone = serializers.BooleanField(read_only=True)


class ProfilePromptSerializer(serializers.Serializer):
    key = serializers.CharField(read_only=True)
    destination = serializers.CharField(read_only=True)
    optional = serializers.BooleanField(default=False, read_only=True)


class ProfileOverviewSerializer(serializers.Serializer):
    completion = ProfileCompletionSerializer(read_only=True)
    verified_contacts = VerifiedContactsSerializer(read_only=True)
    prompts = ProfilePromptSerializer(many=True, read_only=True)
    quick_links = serializers.ListField(
        child=serializers.CharField(),
        read_only=True,
    )


class ContactDetailSerializer(serializers.Serializer):
    value = serializers.CharField(allow_null=True, read_only=True)
    verified = serializers.BooleanField(read_only=True)
    purposes = serializers.ListField(
        child=serializers.CharField(),
        read_only=True,
    )
    recovery_available = serializers.BooleanField(read_only=True)
    managed_by = serializers.CharField(read_only=True)


class ContactInformationSerializer(serializers.Serializer):
    email = ContactDetailSerializer(read_only=True)
    phone = ContactDetailSerializer(read_only=True)


class PersonalInformationSerializer(serializers.Serializer):
    id = serializers.UUIDField(read_only=True)
    profile_image_url = serializers.CharField(
        allow_null=True,
        read_only=True,
    )
    first_name = serializers.CharField(read_only=True)
    last_name = serializers.CharField(read_only=True)
    username = serializers.CharField(allow_null=True, read_only=True)
    country_code = serializers.CharField(read_only=True)
    region = serializers.CharField(read_only=True)
    email = serializers.EmailField(allow_null=True, read_only=True)
    phone_number = serializers.CharField(allow_null=True, read_only=True)
    is_email_verified = serializers.BooleanField(read_only=True)
    is_phone_verified = serializers.BooleanField(read_only=True)
    created_at = serializers.DateTimeField(read_only=True)


class ProfileUpdateSerializer(serializers.Serializer):
    first_name = serializers.CharField(
        max_length=150,
        required=False,
        trim_whitespace=True,
    )
    last_name = serializers.CharField(
        max_length=150,
        required=False,
        trim_whitespace=True,
    )
    username = serializers.RegexField(
        regex=r"^[A-Za-z0-9_]{3,30}$",
        required=False,
        error_messages={
            "invalid": (
                "Username must contain 3 to 30 letters, numbers, or underscores."
            ),
        },
    )
    country_code = serializers.ChoiceField(
        choices=SUPPORTED_COUNTRY_CHOICES,
        required=False,
    )
    region = serializers.CharField(
        allow_blank=True,
        max_length=100,
        required=False,
        trim_whitespace=True,
    )
    profile_image = serializers.ImageField(
        allow_null=False,
        required=False,
    )

    def validate_username(self, value):
        return value.strip().lower()

    def validate_country_code(self, value):
        return value.upper()

    def validate_profile_image(self, value):
        if value.size > 5 * 1024 * 1024:
            raise serializers.ValidationError(
                "The profile image must be 5 MB or smaller.",
                code="profile_image_too_large",
            )

        image_format = getattr(value.image, "format", "").upper()
        if image_format not in {"JPEG", "PNG", "WEBP"}:
            raise serializers.ValidationError(
                "Use a JPEG, PNG, or WebP profile image.",
                code="profile_image_type_invalid",
            )

        width, height = value.image.size
        if width > 4096 or height > 4096:
            raise serializers.ValidationError(
                "The profile image dimensions must not exceed 4096 by 4096 pixels.",
                code="profile_image_dimensions_invalid",
            )

        return value

    def validate(self, attrs):
        identity_managed_fields = sorted(
            {
                "email",
                "phone_number",
                "is_email_verified",
                "is_phone_verified",
            }
            & set(self.initial_data)
        )
        if identity_managed_fields:
            raise serializers.ValidationError(
                {
                    field: serializers.ErrorDetail(
                        "This field must be changed through Identity security.",
                        code="managed_by_identity",
                    )
                    for field in identity_managed_fields
                }
            )

        if not attrs:
            raise serializers.ValidationError(
                "Provide at least one profile field to update.",
                code="profile_update_empty",
            )
        return attrs
