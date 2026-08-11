from common.database.base_model import BaseModel
from django.conf import settings
from django.db import models

from ..rbac.policy import WorkspaceRole


class BusinessInvitation(BaseModel):
    class Status(models.TextChoices):
        PENDING = "pending", "Pending"
        ACCEPTED = "accepted", "Accepted"
        DECLINED = "declined", "Declined"
        CANCELLED = "cancelled", "Cancelled"
        EXPIRED = "expired", "Expired"

    business = models.ForeignKey(
        "workspaces.Business", on_delete=models.CASCADE, related_name="invitations"
    )
    email = models.EmailField(max_length=254)
    role = models.CharField(
        max_length=24,
        choices=[(role.value, role.value.title()) for role in WorkspaceRole],
    )
    status = models.CharField(
        max_length=16, choices=Status.choices, default=Status.PENDING, db_index=True
    )
    invited_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name="business_invitations_sent",
    )
    expires_at = models.DateTimeField()
    resolved_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = "workspaces_invitations"
        ordering = ["-created_at"]
        constraints = [
            models.UniqueConstraint(
                fields=["business", "email"],
                condition=models.Q(status="pending"),
                name="workspace_pending_invitation_unique",
            )
        ]
