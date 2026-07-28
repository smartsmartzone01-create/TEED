from common.database.base_model import BaseModel
from django.conf import settings
from django.db import models
from django.utils import timezone


class EmailDelivery(BaseModel):
    """Durable, idempotent email outbox record."""

    class Template(models.TextChoices):
        EMAIL_VERIFICATION = "email_verification", "Email verification"
        PASSWORD_RESET = "password_reset", "Password reset"
        PASSWORD_CHANGED = "password_changed", "Password changed"

    class Status(models.TextChoices):
        PENDING = "pending", "Pending"
        PROCESSING = "processing", "Processing"
        RETRY = "retry", "Retry"
        SENT = "sent", "Sent"
        DEAD = "dead", "Dead letter"

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="email_deliveries",
    )
    template = models.CharField(max_length=32, choices=Template.choices)
    status = models.CharField(
        max_length=16,
        choices=Status.choices,
        default=Status.PENDING,
        db_index=True,
    )
    idempotency_key = models.CharField(max_length=128, unique=True)
    recipient_hash = models.CharField(max_length=64)
    encrypted_payload = models.TextField()
    challenge_id = models.UUIDField(null=True, blank=True, db_index=True)
    attempt_count = models.PositiveSmallIntegerField(default=0)
    max_attempts = models.PositiveSmallIntegerField(default=5)
    next_attempt_at = models.DateTimeField(default=timezone.now, db_index=True)
    locked_at = models.DateTimeField(null=True, blank=True)
    sent_at = models.DateTimeField(null=True, blank=True)
    expires_at = models.DateTimeField(db_index=True)
    provider_message_id = models.CharField(max_length=255, blank=True, default="")
    last_error_code = models.CharField(max_length=64, blank=True, default="")

    class Meta:
        db_table = "identity_email_deliveries"
        ordering = ["-created_at"]
        indexes = [
            models.Index(
                fields=["status", "next_attempt_at"],
                name="identity_email_due_idx",
            ),
        ]

    def __str__(self):
        return f"{self.template}:{self.status}:{self.id}"
