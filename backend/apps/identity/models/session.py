from common.database.base_model import BaseModel
from common.database.uuid import generate_uuid
from django.conf import settings
from django.db import models
from django.utils import timezone


class UserSession(BaseModel):
    """Server-side authority for one rotating refresh-token family."""

    class RevokeReason(models.TextChoices):
        LOGOUT = "logout", "Logout"
        LOGOUT_ALL = "logout_all", "Logout all"
        REFRESH_REUSE = "refresh_reuse", "Refresh token reuse"
        USER_INACTIVE = "user_inactive", "User inactive"
        EXPIRED = "expired", "Expired"
        SECURITY_EVENT = "security_event", "Security event"
        PASSWORD_RESET = "password_reset", "Password reset"
        PASSWORD_CHANGE = "password_change", "Password change"
        USER_REVOKED = "user_revoked", "Revoked by user"

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
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
    expires_at = models.DateTimeField(
        db_index=True,
    )
    last_seen_at = models.DateTimeField(
        default=timezone.now,
    )
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
    ip_address = models.GenericIPAddressField(
        null=True,
        blank=True,
    )
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
        db_table = "identity_user_sessions"
        ordering = ["-created_at"]
        indexes = [
            models.Index(
                fields=["user", "revoked_at", "expires_at"],
                name="identity_session_active_idx",
            ),
        ]

    @property
    def is_active(self):
        return self.revoked_at is None and self.expires_at > timezone.now()

    def __str__(self):
        return f"{self.user_id}:{self.id}"
