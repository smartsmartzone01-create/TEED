from common.database.base_model import BaseModel
from django.conf import settings
from django.db import models

from ..rbac.policy import WorkspaceRole


class BusinessAccessRequest(BaseModel):
    class Status(models.TextChoices):
        PENDING = "pending", "Pending"
        APPROVED = "approved", "Approved"
        REJECTED = "rejected", "Rejected"
        CANCELLED = "cancelled", "Cancelled"
        EXPIRED = "expired", "Expired"

    business = models.ForeignKey(
        "workspaces.Business", on_delete=models.CASCADE, related_name="access_requests"
    )
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="business_access_requests",
    )
    requested_role = models.CharField(
        max_length=24,
        choices=[(role.value, role.value.title()) for role in WorkspaceRole],
        default=WorkspaceRole.MEMBER.value,
    )
    status = models.CharField(
        max_length=16, choices=Status.choices, default=Status.PENDING, db_index=True
    )
    message = models.CharField(max_length=300, blank=True, default="")
    resolved_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="business_access_requests_resolved",
    )
    resolved_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = "workspaces_access_requests"
        ordering = ["-created_at"]
        constraints = [
            models.UniqueConstraint(
                fields=["business", "user"],
                condition=models.Q(status="pending"),
                name="workspace_pending_access_request_unique",
            )
        ]
