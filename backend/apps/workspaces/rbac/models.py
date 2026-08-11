from common.database.base_model import BaseModel
from django.conf import settings
from django.db import models

from .policy import WorkspaceRole


class BusinessMembership(BaseModel):
    class Status(models.TextChoices):
        ACTIVE = "active", "Active"
        SUSPENDED = "suspended", "Suspended"
        REMOVED = "removed", "Removed"

    business = models.ForeignKey(
        "workspaces.Business", on_delete=models.CASCADE, related_name="memberships"
    )
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="business_memberships",
    )
    role = models.CharField(
        max_length=24,
        choices=[(role.value, role.value.title()) for role in WorkspaceRole],
    )
    status = models.CharField(
        max_length=16, choices=Status.choices, default=Status.ACTIVE, db_index=True
    )

    class Meta:
        db_table = "workspaces_memberships"
        ordering = ["created_at"]
        constraints = [
            models.UniqueConstraint(
                fields=["business", "user"], name="workspace_membership_unique"
            ),
            models.UniqueConstraint(
                fields=["business"],
                condition=models.Q(role=WorkspaceRole.OWNER.value, status="active"),
                name="workspace_one_active_owner",
            ),
        ]
