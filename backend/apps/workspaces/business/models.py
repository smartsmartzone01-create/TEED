from common.database.base_model import BaseModel
from django.conf import settings
from django.db import models
from django.db.models.functions import Lower


class Business(BaseModel):
    class WorkspaceType(models.TextChoices):
        BUSINESS = "business", "Business"
        SERVICE_PROVIDER = "service_provider", "Service provider"
        CREATOR_BRAND = "creator_brand", "Creator or personal brand"
        PERSONAL = "personal", "Personal"
        OTHER = "other", "Other"

    class Status(models.TextChoices):
        ACTIVE = "active", "Active"
        DISABLED = "disabled", "Disabled"
        DELETION_PENDING = "deletion_pending", "Deletion pending"

    name = models.CharField(max_length=120)
    public_handle = models.SlugField(max_length=80, unique=True)
    country_code = models.CharField(max_length=2, blank=True, default="")
    workspace_type = models.CharField(
        max_length=24,
        choices=WorkspaceType.choices,
        default=WorkspaceType.BUSINESS,
        db_index=True,
    )
    is_discoverable = models.BooleanField(default=True, db_index=True)
    status = models.CharField(
        max_length=24, choices=Status.choices, default=Status.ACTIVE, db_index=True
    )
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name="created_businesses",
    )

    class Meta:
        db_table = "workspaces_businesses"
        ordering = ["name", "id"]
        constraints = [
            models.UniqueConstraint(
                Lower("public_handle"), name="workspace_public_handle_ci_unique"
            )
        ]

    def __str__(self):
        return self.name
