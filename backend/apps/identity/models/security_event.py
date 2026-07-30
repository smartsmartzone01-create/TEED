from datetime import timedelta

from common.database.base_model import BaseModel
from django.conf import settings
from django.db import models
from django.utils import timezone


def default_security_event_expiry():
    return timezone.now() + timedelta(
        days=settings.IDENTITY_SECURITY_EVENT_RETENTION_DAYS
    )


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
        EMAIL_DELIVERY_QUEUED = "email_delivery_queued", "Email delivery queued"
        EMAIL_DELIVERY_RETRY = "email_delivery_retry", "Email delivery retry"
        EMAIL_DELIVERY_DEAD = "email_delivery_dead", "Email delivery dead letter"
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
        LOGIN_SUCCEEDED = "login_succeeded", "Login succeeded"
        LOGIN_FAILED = "login_failed", "Login failed"
        REGISTRATION_SUCCEEDED = (
            "registration_succeeded",
            "Registration succeeded",
        )
        REGISTRATION_FAILED = "registration_failed", "Registration failed"
        PASSWORD_RESET_REQUESTED = (
            "password_reset_requested",
            "Password reset requested",
        )
        PASSWORD_RESET_REQUEST_BLOCKED = (
            "password_reset_request_blocked",
            "Password reset request blocked",
        )
        PASSWORD_RESET_CODE_SUCCEEDED = (
            "password_reset_code_succeeded",
            "Password reset code succeeded",
        )
        PASSWORD_RESET_CODE_FAILED = (
            "password_reset_code_failed",
            "Password reset code failed",
        )
        PASSWORD_RESET_SUCCEEDED = (
            "password_reset_succeeded",
            "Password reset succeeded",
        )
        PASSWORD_RESET_FAILED = (
            "password_reset_failed",
            "Password reset failed",
        )
        PROFILE_UPDATED = "profile_updated", "Profile updated"
        PROFILE_IMAGE_REMOVED = (
            "profile_image_removed",
            "Profile image removed",
        )

    class Outcome(models.TextChoices):
        SUCCESS = "success", "Success"
        FAILURE = "failure", "Failure"
        BLOCKED = "blocked", "Blocked"

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        related_name="security_events",
        null=True,
        blank=True,
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
    session_id = models.UUIDField(null=True, blank=True)
    device_id = models.UUIDField(null=True, blank=True, db_index=True)
    identifier_hash = models.CharField(max_length=64, blank=True, default="")
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
    expires_at = models.DateTimeField(
        default=default_security_event_expiry,
        db_index=True,
    )

    class Meta:
        db_table = "identity_security_events"
        ordering = ["-created_at"]
        indexes = [
            models.Index(
                fields=["user", "event_type", "created_at"],
                name="identity_security_event_idx",
            ),
            models.Index(
                fields=["identifier_hash", "event_type", "created_at"],
                name="identity_event_identifier_idx",
            ),
        ]

    def __str__(self):
        return f"{self.user_id or 'anonymous'}:{self.event_type}:{self.created_at}"
