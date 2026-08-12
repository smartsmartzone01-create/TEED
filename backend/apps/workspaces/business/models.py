from common.database.base_model import BaseModel
from django.conf import settings
from django.db import models
from django.db.models.functions import Lower


def business_logo_upload_path(instance, filename):
    extension = filename.rsplit(".", 1)[-1].lower()
    return f"businesses/{instance.business_id}/logo.{extension}"


class Business(BaseModel):
    class WorkspaceType(models.TextChoices):
        BUSINESS = "business", "Business"
        SERVICE_PROVIDER = "service_provider", "Service provider"
        CREATOR_BRAND = "creator_brand", "Creator or personal brand"
        PERSONAL = "personal", "Personal"
        OTHER = "other", "Other"

    class Status(models.TextChoices):
        ACTIVE = "active", "Active"
        DISABLED = "disabled", "Disabled"
        DELETION_PENDING = "deletion_pending", "Deletion pending"

    name = models.CharField(max_length=120)
    public_handle = models.SlugField(max_length=80, unique=True)
    public_handle_changed_at = models.DateTimeField(null=True, blank=True)
    country_code = models.CharField(max_length=2, blank=True, default="")
    workspace_type = models.CharField(
        max_length=24,
        choices=WorkspaceType.choices,
        default=WorkspaceType.BUSINESS,
        db_index=True,
    )
    is_discoverable = models.BooleanField(default=True, db_index=True)
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
        constraints = [
            models.UniqueConstraint(
                Lower("public_handle"), name="workspace_public_handle_ci_unique"
            )
        ]

    def __str__(self):
        return self.name


class BusinessProfile(BaseModel):
    class OperatingModel(models.TextChoices):
        PHYSICAL = "physical", "Physical"
        ONLINE = "online", "Online"
        HYBRID = "hybrid", "Hybrid"

    business = models.OneToOneField(
        Business, on_delete=models.CASCADE, related_name="profile"
    )
    logo = models.ImageField(upload_to=business_logo_upload_path, blank=True, null=True)
    description = models.CharField(max_length=300, blank=True, default="")
    industry = models.CharField(max_length=80, blank=True, default="")
    operating_model = models.CharField(
        max_length=16, choices=OperatingModel.choices, blank=True, default=""
    )
    region = models.CharField(max_length=80, blank=True, default="")
    city = models.CharField(max_length=80, blank=True, default="")
    address = models.CharField(max_length=160, blank=True, default="")
    primary_brand_color = models.CharField(max_length=7, default="#0B1F3A")
    secondary_brand_color = models.CharField(max_length=7, default="#F97316")

    class Meta:
        db_table = "workspaces_business_profiles"


class BusinessSettings(BaseModel):
    class Language(models.TextChoices):
        ENGLISH = "en", "English"
        SWAHILI = "sw", "Swahili"

    class DateFormat(models.TextChoices):
        DAY_FIRST = "DD/MM/YYYY", "DD/MM/YYYY"
        MONTH_FIRST = "MM/DD/YYYY", "MM/DD/YYYY"
        ISO = "YYYY-MM-DD", "YYYY-MM-DD"

    class TimeFormat(models.TextChoices):
        TWELVE_HOUR = "12h", "12-hour"
        TWENTY_FOUR_HOUR = "24h", "24-hour"

    business = models.OneToOneField(
        Business, on_delete=models.CASCADE, related_name="settings"
    )
    language_code = models.CharField(
        max_length=2, choices=Language.choices, default=Language.ENGLISH
    )
    timezone = models.CharField(max_length=64, default="Africa/Dar_es_Salaam")
    date_format = models.CharField(
        max_length=10, choices=DateFormat.choices, default=DateFormat.DAY_FIRST
    )
    time_format = models.CharField(
        max_length=3, choices=TimeFormat.choices, default=TimeFormat.TWENTY_FOUR_HOUR
    )
    branding_enabled = models.BooleanField(default=True)

    class Meta:
        db_table = "workspaces_business_settings"
