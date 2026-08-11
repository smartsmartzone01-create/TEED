from common.database.base_model import BaseModel
from django.conf import settings
from django.db import models


class BusinessControlRequest(BaseModel):
    class Action(models.TextChoices):
        DISABLE = "disable", "Disable"
        REACTIVATE = "reactivate", "Reactivate"
        DELETE = "delete", "Delete"
        CANCEL_DELETION = "cancel_deletion", "Cancel deletion"

    class Status(models.TextChoices):
        PENDING = "pending", "Pending"
        APPROVED = "approved", "Approved"
        REJECTED = "rejected", "Rejected"
        CANCELLED = "cancelled", "Cancelled"
        EXPIRED = "expired", "Expired"

    business = models.ForeignKey(
        "workspaces.Business", on_delete=models.CASCADE, related_name="control_requests"
    )
    action = models.CharField(max_length=16, choices=Action.choices)
    status = models.CharField(
        max_length=16, choices=Status.choices, default=Status.PENDING, db_index=True
    )
    initiated_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name="business_control_requests_initiated",
    )
    resolved_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="business_control_requests_resolved",
    )
    expires_at = models.DateTimeField()
    resolved_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = "workspaces_control_requests"
        ordering = ["-created_at"]
        constraints = [
            models.UniqueConstraint(
                fields=["business", "action"],
                condition=models.Q(status="pending"),
                name="workspace_pending_control_unique",
            )
        ]
