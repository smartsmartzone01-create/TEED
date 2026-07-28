from common.database.base_model import BaseModel
from django.conf import settings
from django.db import models


class IdentitySecurityEvent(BaseModel):
    """Append-only security record without credentials or direct contact data."""

    class EventType(models.TextChoices):
        EMAIL_CHALLENGE_ISSUED = (
            "email_challenge_issued",
            "Email challenge issued",
        )
        EMAIL_DELIVERY_SUCCEEDED = (
            "email_delivery_succeeded",
            "Email delivery succeeded",
        )
        EMAIL_DELIVERY_FAILED = (
            "email_delivery_failed",
            "Email delivery failed",
        )
        EMAIL_VERIFICATION_SUCCEEDED = (
            "email_verification_succeeded",
            "Email verification succeeded",
        )
        EMAIL_VERIFICATION_FAILED = (
            "email_verification_failed",
            "Email verification failed",
        )
        EMAIL_RESEND_BLOCKED = (
            "email_resend_blocked",
            "Email resend blocked",
        )

    class Outcome(models.TextChoices):
        SUCCESS = "success", "Success"
        FAILURE = "failure", "Failure"
        BLOCKED = "blocked", "Blocked"

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="security_events",
    )
    event_type = models.CharField(
        max_length=64,
        choices=EventType.choices,
        db_index=True,
    )
    outcome = models.CharField(
        max_length=16,
        choices=Outcome.choices,
        db_index=True,
    )
    challenge_id = models.UUIDField(
        null=True,
        blank=True,
    )
    ip_address = models.GenericIPAddressField(
        null=True,
        blank=True,
    )
    user_agent_hash = models.CharField(
        max_length=64,
        blank=True,
        default="",
    )
    metadata = models.JSONField(
        default=dict,
        blank=True,
    )

    class Meta:
        db_table = "identity_security_events"
        ordering = ["-created_at"]
        indexes = [
            models.Index(
                fields=["user", "event_type", "created_at"],
                name="identity_security_event_idx",
            ),
        ]

    def __str__(self):
        return f"{self.user_id}:{self.event_type}:{self.created_at}"
