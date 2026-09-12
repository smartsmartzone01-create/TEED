from common.database.base_model import BaseModel
from common.database.uuid import generate_uuid
from django.contrib.auth.base_user import AbstractBaseUser
from django.db import models
from django.db.models.functions import Lower
from django.utils import timezone


class StorefrontCustomer(AbstractBaseUser, BaseModel):
    """Customer identity for one merchant/business storefront realm."""

    business = models.ForeignKey(
        "workspaces.Business",
        on_delete=models.CASCADE,
        related_name="storefront_customers",
    )
    email = models.EmailField(
        max_length=254,
        null=True,
        blank=True,
    )
    phone_number = models.CharField(
        max_length=16,
        null=True,
        blank=True,
    )
    first_name = models.CharField(max_length=150, blank=True)
    last_name = models.CharField(max_length=150, blank=True)
    is_active = models.BooleanField(default=True)
    is_email_verified = models.BooleanField(default=False)
    is_phone_verified = models.BooleanField(default=False)

    USERNAME_FIELD = "email"
    REQUIRED_FIELDS = []

    class Meta:
        db_table = "identity_storefront_customers"
        ordering = ["-created_at"]
        constraints = [
            models.UniqueConstraint(
                Lower("email"),
                models.F("business"),
                condition=models.Q(email__isnull=False),
                name="identity_sf_biz_email_ci_uniq",
            ),
            models.UniqueConstraint(
                fields=["business", "phone_number"],
                condition=models.Q(phone_number__isnull=False),
                name="identity_sf_biz_phone_uniq",
            ),
            models.CheckConstraint(
                condition=(
                    models.Q(email__isnull=False)
                    | models.Q(phone_number__isnull=False)
                ),
                name="identity_sf_identifier_present",
            ),
        ]

    def __str__(self):
        return self.email or self.phone_number or str(self.id)

    def get_full_name(self):
        return " ".join(
            part
            for part in [
                self.first_name,
                self.last_name,
            ]
            if part
        ).strip()

    @property
    def is_identity_verified(self):
        return self.is_email_verified or self.is_phone_verified


class StorefrontCustomerVerificationChallenge(BaseModel):
    """Hashed verification challenge for a storefront customer."""

    class Channel(models.TextChoices):
        EMAIL = "email", "Email"
        PHONE = "phone", "Phone"

    class Purpose(models.TextChoices):
        REGISTRATION = "registration", "Registration"
        PASSWORD_RESET = "password_reset", "Password reset"
        ACCOUNT_PROTECTION = "account_protection", "Account protection"

    customer = models.ForeignKey(
        StorefrontCustomer,
        on_delete=models.CASCADE,
        related_name="verification_challenges",
    )
    channel = models.CharField(
        max_length=16,
        choices=Channel.choices,
    )
    purpose = models.CharField(
        max_length=32,
        choices=Purpose.choices,
        default=Purpose.REGISTRATION,
    )
    destination = models.CharField(max_length=254)
    code_digest = models.CharField(max_length=128)
    expires_at = models.DateTimeField()
    attempt_count = models.PositiveSmallIntegerField(default=0)
    max_attempts = models.PositiveSmallIntegerField(default=5)
    consumed_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = "identity_storefront_customer_verification_challenges"
        ordering = ["-created_at"]
        indexes = [
            models.Index(
                fields=["customer", "channel", "purpose", "consumed_at"],
                name="identity_sf_challenge_idx",
            ),
        ]
        constraints = [
            models.CheckConstraint(
                condition=models.Q(attempt_count__lte=models.F("max_attempts")),
                name="identity_sf_attempt_limit",
            ),
        ]

    @property
    def is_expired(self):
        return timezone.now() >= self.expires_at

    @property
    def is_consumed(self):
        return self.consumed_at is not None

    @property
    def can_attempt(self):
        return (
            not self.is_deleted
            and not self.is_consumed
            and not self.is_expired
            and self.attempt_count < self.max_attempts
        )


class StorefrontCustomerSession(BaseModel):
    """Server-side authority for a storefront customer refresh-token family."""

    class RevokeReason(models.TextChoices):
        LOGOUT = "logout", "Logout"
        LOGOUT_ALL = "logout_all", "Logout all"
        REFRESH_REUSE = "refresh_reuse", "Refresh token reuse"
        CUSTOMER_INACTIVE = "customer_inactive", "Customer inactive"
        EXPIRED = "expired", "Expired"
        SECURITY_EVENT = "security_event", "Security event"
        PASSWORD_RESET = "password_reset", "Password reset"
        PASSWORD_CHANGE = "password_change", "Password change"
        CUSTOMER_REVOKED = "customer_revoked", "Revoked by customer"

    customer = models.ForeignKey(
        StorefrontCustomer,
        on_delete=models.CASCADE,
        related_name="sessions",
    )
    family_id = models.UUIDField(
        default=generate_uuid,
        editable=False,
        db_index=True,
    )
    current_refresh_jti = models.UUIDField(
        unique=True,
        null=True,
        blank=True,
    )
    expires_at = models.DateTimeField(db_index=True)
    last_seen_at = models.DateTimeField(default=timezone.now)
    revoked_at = models.DateTimeField(
        null=True,
        blank=True,
        db_index=True,
    )
    revoke_reason = models.CharField(
        max_length=32,
        choices=RevokeReason.choices,
        blank=True,
        default="",
    )
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    device_id = models.UUIDField(null=True, blank=True, db_index=True)
    user_agent_hash = models.CharField(
        max_length=64,
        blank=True,
        default="",
    )
    device_label = models.CharField(max_length=80, blank=True, default="")
    browser = models.CharField(max_length=40, blank=True, default="")
    operating_system = models.CharField(max_length=40, blank=True, default="")

    class Meta:
        db_table = "identity_storefront_customer_sessions"
        ordering = ["-created_at"]
        indexes = [
            models.Index(
                fields=["customer", "revoked_at", "expires_at"],
                name="identity_sf_session_active_idx",
            ),
        ]

    @property
    def is_active(self):
        return self.revoked_at is None and self.expires_at > timezone.now()
