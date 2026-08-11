from common.database.base_model import BaseModel
from django.conf import settings
from django.db import models


class Business(BaseModel):
    class Status(models.TextChoices):
        ACTIVE = "active", "Active"
        DISABLED = "disabled", "Disabled"
        DELETION_PENDING = "deletion_pending", "Deletion pending"

    name = models.CharField(max_length=120)
    country_code = models.CharField(max_length=2, blank=True, default="")
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

    def __str__(self):
        return self.name
