from common.database.base_model import BaseModel
from django.conf import settings
from django.db import models


class UserPreference(BaseModel):
    """Personal application behavior owned by the dashboard domain."""

    class Language(models.TextChoices):
        ENGLISH = "en", "English"
        SWAHILI = "sw", "Swahili"

    class Appearance(models.TextChoices):
        SYSTEM = "system", "System"
        LIGHT = "light", "Light"
        DARK = "dark", "Dark"

    class DateFormat(models.TextChoices):
        DAY_MONTH_YEAR = "DD/MM/YYYY", "DD/MM/YYYY"
        MONTH_DAY_YEAR = "MM/DD/YYYY", "MM/DD/YYYY"
        YEAR_MONTH_DAY = "YYYY-MM-DD", "YYYY-MM-DD"

    class TimeFormat(models.TextChoices):
        TWELVE_HOUR = "12h", "12-hour"
        TWENTY_FOUR_HOUR = "24h", "24-hour"

    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="preferences",
    )
    language = models.CharField(
        max_length=2,
        choices=Language.choices,
        default=Language.ENGLISH,
    )
    appearance = models.CharField(
        max_length=10,
        choices=Appearance.choices,
        default=Appearance.SYSTEM,
    )
    timezone = models.CharField(max_length=64, default="UTC")
    date_format = models.CharField(
        max_length=10,
        choices=DateFormat.choices,
        default=DateFormat.DAY_MONTH_YEAR,
    )
    time_format = models.CharField(
        max_length=3,
        choices=TimeFormat.choices,
        default=TimeFormat.TWENTY_FOUR_HOUR,
    )
    reduced_motion = models.BooleanField(default=False)

    class Meta:
        app_label = "profiles"
        db_table = "dashboard_user_preferences"
        ordering = ["-created_at"]

    def __str__(self):
        return f"preferences:{self.user_id}"
