from common.database.base_model import BaseModel
from django.conf import settings
from django.db import models


class UserNotification(BaseModel):
    """User-addressed event routed to its owning TEED surface."""

    class Category(models.TextChoices):
        SECURITY = "security", "Security"
        ACCOUNT = "account", "Account"
        WORKSPACE = "workspace", "Workspace"
        SYSTEM = "system", "System"

    class Scope(models.TextChoices):
        PERSONAL = "personal", "Personal"
        MEMBERSHIP = "membership", "Membership"
        WORKSPACE = "workspace", "Workspace governance"
        CROSS_BUSINESS = "cross_business", "Cross-business"

    class Template(models.TextChoices):
        PASSWORD_CHANGED = "password_changed", "Password changed"
        SESSION_REVOKED = "session_revoked", "Session revoked"
        OTHER_SESSIONS_REVOKED = (
            "other_sessions_revoked",
            "Other sessions revoked",
        )
        WORKSPACE_INVITATION = "workspace_invitation", "Workspace invitation"
        WORKSPACE_ACCESS_REQUEST = (
            "workspace_access_request",
            "Workspace access request",
        )
        WORKSPACE_ACCESS_DECISION = (
            "workspace_access_decision",
            "Workspace access decision",
        )
        WORKSPACE_MEMBERSHIP_CHANGED = (
            "workspace_membership_changed",
            "Workspace membership changed",
        )
        BUSINESS_CONTROL_REQUEST = (
            "business_control_request",
            "Business control request",
        )
        BUSINESS_CONTROL_DECISION = (
            "business_control_decision",
            "Business control decision",
        )
        COMMERCE_SOLD_OUT = "commerce_sold_out", "Commerce item sold out"
        COMMERCE_LOW_STOCK = "commerce_low_stock", "Commerce item low stock"
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
    scope = models.CharField(
        max_length=24, choices=Scope.choices, default=Scope.PERSONAL, db_index=True
    )
    business_id = models.UUIDField(null=True, blank=True, db_index=True)
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
