from common.database.base_model import BaseModel
from django.conf import settings
from django.db import models
from django.utils import timezone


class EmailVerificationChallenge(BaseModel):
    """
    Stores a hashed email-verification code.

    Plain verification codes must never be persisted.
    """

    class Purpose(models.TextChoices):
        REGISTRATION = (
            "registration",
            "Registration",
        )
        PASSWORD_RESET = (
            "password_reset",
            "Password reset",
        )
        ACCOUNT_PROTECTION = (
            "account_protection",
            "Account protection",
        )

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="email_verification_challenges",
    )

    purpose = models.CharField(
        max_length=32,
        choices=Purpose.choices,
        default=Purpose.REGISTRATION,
    )

    code_digest = models.CharField(
        max_length=128,
    )

    expires_at = models.DateTimeField()

    attempt_count = models.PositiveSmallIntegerField(
        default=0,
    )

    max_attempts = models.PositiveSmallIntegerField(
        default=5,
    )

    consumed_at = models.DateTimeField(
        null=True,
        blank=True,
    )

    class Meta:
        db_table = "identity_email_verification_challenges"
        ordering = ["-created_at"]
        indexes = [
            models.Index(
                fields=[
                    "user",
                    "purpose",
                    "consumed_at",
                ],
                name="identity_email_challenge_idx",
            ),
        ]
        constraints = [
            models.CheckConstraint(
                condition=models.Q(
                    attempt_count__lte=models.F(
                        "max_attempts",
                    )
                ),
                name="identity_email_attempt_limit",
            ),
        ]

    def __str__(self):
        return f"{self.user_id}:{self.purpose}:{self.created_at}"

    @property
    def is_expired(self):
        return timezone.now() >= self.expires_at

    @property
    def is_consumed(self):
        return self.consumed_at is not None

    @property
    def can_attempt(self):
        return (
            not self.is_deleted
            and not self.is_consumed
            and not self.is_expired
            and self.attempt_count < self.max_attempts
        )
