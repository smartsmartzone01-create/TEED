from common.database.base_model import BaseModel
from django.db import models


class ExternalIdentity(BaseModel):
    """Stable identity issued by an external authentication provider."""

    class Provider(models.TextChoices):
        GOOGLE = "google", "Google"

    user = models.ForeignKey(
        "identity.User",
        on_delete=models.CASCADE,
        related_name="external_identities",
    )
    provider = models.CharField(
        max_length=32,
        choices=Provider.choices,
    )
    subject = models.CharField(max_length=255)
    email_snapshot = models.EmailField(
        max_length=254,
        blank=True,
        default="",
    )

    class Meta:
        db_table = "identity_external_identities"
        ordering = ["-created_at"]
        constraints = [
            models.UniqueConstraint(
                fields=["provider", "subject"],
                condition=models.Q(is_deleted=False),
                name="identity_ext_subject_unique",
            ),
            models.UniqueConstraint(
                fields=["user", "provider"],
                condition=models.Q(is_deleted=False),
                name="identity_ext_user_provider",
            ),
        ]

    def __str__(self):
        return f"{self.provider}:{self.subject}"
