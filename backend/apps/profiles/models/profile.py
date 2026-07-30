from pathlib import Path
from uuid import uuid4

from common.database.base_model import BaseModel
from django.conf import settings
from django.db import models


def profile_image_upload_path(instance, filename):
    suffix = Path(filename).suffix.lower()
    return f"profiles/{instance.user_id}/{uuid4().hex}{suffix}"


class UserProfile(BaseModel):
    """Profile-specific state that does not belong to authentication."""

    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="profile",
    )
    profile_image = models.ImageField(
        upload_to=profile_image_upload_path,
        blank=True,
        null=True,
    )
    region = models.CharField(
        max_length=100,
        blank=True,
        default="",
    )

    class Meta:
        db_table = "profile_user_profiles"
        ordering = ["-created_at"]

    def __str__(self):
        return f"profile:{self.user_id}"
