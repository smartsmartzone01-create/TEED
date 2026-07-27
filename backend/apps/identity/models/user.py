from django.contrib.auth.models import (
    AbstractBaseUser,
    PermissionsMixin,
)
from django.db import models
from django.db.models.functions import Lower

from common.database.base_model import BaseModel
from common.database.managers import AllObjectsManager

from ..managers import UserManager


class User(
    AbstractBaseUser,
    PermissionsMixin,
    BaseModel,
):
    """
    Core TEED identity.

    Authentication may begin through email, phone, or an
    external provider. Every user must complete onboarding
    before accessing normal business functionality.
    """

    email = models.EmailField(
        max_length=254,
        unique=True,
        null=True,
        blank=True,
    )

    username = models.CharField(
        max_length=50,
        unique=True,
        null=True,
        blank=True,
    )

    phone_number = models.CharField(
        max_length=16,
        unique=True,
        null=True,
        blank=True,
    )

    country_code = models.CharField(
        max_length=2,
        blank=True,
        default="",
    )

    first_name = models.CharField(
        max_length=150,
        blank=True,
    )

    last_name = models.CharField(
        max_length=150,
        blank=True,
    )

    is_active = models.BooleanField(
        default=True,
    )

    is_staff = models.BooleanField(
        default=False,
    )

    is_email_verified = models.BooleanField(
        default=False,
    )

    is_phone_verified = models.BooleanField(
        default=False,
    )

    onboarding_completed_at = models.DateTimeField(
        null=True,
        blank=True,
    )

    objects = UserManager()
    all_objects = AllObjectsManager()

    USERNAME_FIELD = "email"
    REQUIRED_FIELDS = []

    class Meta:
        db_table = "identity_users"
        ordering = ["-created_at"]
        constraints = [
            models.UniqueConstraint(
                Lower("email"),
                condition=models.Q(
                    email__isnull=False,
                ),
                name="identity_user_email_ci_unique",
            ),
            models.UniqueConstraint(
                Lower("username"),
                condition=models.Q(
                    username__isnull=False,
                ),
                name="identity_user_username_ci_unique",
            ),
        ]

    def __str__(self):
        return (
            self.username
            or self.email
            or self.phone_number
            or str(self.id)
        )

    def get_full_name(self):
        return " ".join(
            part
            for part in [
                self.first_name,
                self.last_name,
            ]
            if part
        ).strip()

    def get_short_name(self):
        return (
            self.username
            or self.first_name
            or self.email
            or self.phone_number
            or str(self.id)
        )

    @property
    def is_onboarding_complete(self):
        return self.onboarding_completed_at is not None