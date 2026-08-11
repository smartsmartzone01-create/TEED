from common.database.base_model import BaseModel
from django.conf import settings
from django.db import models


class WorkspaceAuditEvent(BaseModel):
    business = models.ForeignKey(
        "workspaces.Business", on_delete=models.CASCADE, related_name="audit_events"
    )
    actor = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name="workspace_audit_events",
    )
    event_type = models.CharField(max_length=64, db_index=True)
    target_id = models.UUIDField(null=True, blank=True)
    metadata = models.JSONField(default=dict, blank=True)

    class Meta:
        db_table = "workspaces_audit_events"
        ordering = ["-created_at"]
