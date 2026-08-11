from common.database.base_model import BaseModel
from django.conf import settings
from django.db import models


class UserNotification(BaseModel):
    """Personal inbox record; the owning domain remains responsible for actions."""

    class Category(models.TextChoices):
        SECURITY = "security", "Security"
        ACCOUNT = "account", "Account"
        WORKSPACE = "workspace", "Workspace"
        SYSTEM = "system", "System"

    class Template(models.TextChoices):
        PASSWORD_CHANGED = "password_changed", "Password changed"
        SESSION_REVOKED = "session_revoked", "Session revoked"
        OTHER_SESSIONS_REVOKED = (
            "other_sessions_revoked",
            "Other sessions revoked",
        )
        WORKSPACE_INVITATION = "workspace_invitation", "Workspace invitation"
        SYSTEM_ANNOUNCEMENT = "system_announcement", "System announcement"

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="notifications",
    )
    category = models.CharField(max_length=24, choices=Category.choices, db_index=True)
    template = models.CharField(max_length=48, choices=Template.choices, db_index=True)
    context = models.JSONField(default=dict, blank=True)
    action_path = models.CharField(max_length=240, blank=True, default="")
    read_at = models.DateTimeField(null=True, blank=True, db_index=True)
    expires_at = models.DateTimeField(null=True, blank=True, db_index=True)
    deduplication_key = models.CharField(max_length=120, blank=True, default="")

    class Meta:
        db_table = "notifications_user_notifications"
        ordering = ["-created_at"]
        indexes = [
            models.Index(
                fields=["user", "read_at", "created_at"],
                name="notification_user_unread_idx",
            ),
        ]
        constraints = [
            models.UniqueConstraint(
                fields=["user", "deduplication_key"],
                condition=~models.Q(deduplication_key=""),
                name="notification_user_dedupe_unique",
            )
        ]

    def __str__(self):
        return f"{self.user_id}:{self.template}"
