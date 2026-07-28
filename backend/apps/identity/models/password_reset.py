from common.database.base_model import BaseModel
from django.conf import settings
from django.db import models


class PasswordResetGrant(BaseModel):
    """Single-use, short-lived authority to replace one user's password."""

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="password_reset_grants",
    )
    challenge_id = models.UUIDField(db_index=True)
    token_digest = models.CharField(max_length=64, unique=True)
    expires_at = models.DateTimeField(db_index=True)
    consumed_at = models.DateTimeField(null=True, blank=True, db_index=True)
    device_id = models.UUIDField(null=True, blank=True)

    class Meta:
        db_table = "identity_password_reset_grants"
        ordering = ["-created_at"]
        indexes = [
            models.Index(
                fields=["user", "consumed_at", "expires_at"],
                name="identity_reset_grant_idx",
            ),
        ]

    def __str__(self):
        return f"{self.user_id}:{self.created_at}"
