import common.database.uuid
import django.db.models.deletion
from django.db import migrations, models

import apps.workspaces.business.models


def create_business_management_records(apps, schema_editor):
    Business = apps.get_model("workspaces", "Business")
    BusinessProfile = apps.get_model("workspaces", "BusinessProfile")
    BusinessSettings = apps.get_model("workspaces", "BusinessSettings")
    for business in Business.objects.iterator():
        BusinessProfile.objects.get_or_create(business=business)
        BusinessSettings.objects.get_or_create(business=business)


class Migration(migrations.Migration):
    dependencies = [("workspaces", "0002_business_discovery_and_type")]

    operations = [
        migrations.AddField(
            model_name="business",
            name="public_handle_changed_at",
            field=models.DateTimeField(blank=True, null=True),
        ),
        migrations.CreateModel(
            name="BusinessProfile",
            fields=[
                (
                    "id",
                    models.UUIDField(
                        default=common.database.uuid.generate_uuid,
                        editable=False,
                        primary_key=True,
                        serialize=False,
                    ),
                ),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                ("is_deleted", models.BooleanField(db_index=True, default=False)),
                ("deleted_at", models.DateTimeField(blank=True, null=True)),
                (
                    "logo",
                    models.ImageField(
                        blank=True,
                        null=True,
                        upload_to=apps.workspaces.business.models.business_logo_upload_path,
                    ),
                ),
                (
                    "description",
                    models.CharField(blank=True, default="", max_length=300),
                ),
                ("industry", models.CharField(blank=True, default="", max_length=80)),
                (
                    "operating_model",
                    models.CharField(
                        blank=True,
                        choices=[
                            ("physical", "Physical"),
                            ("online", "Online"),
                            ("hybrid", "Hybrid"),
                        ],
                        default="",
                        max_length=16,
                    ),
                ),
                ("region", models.CharField(blank=True, default="", max_length=80)),
                ("city", models.CharField(blank=True, default="", max_length=80)),
                ("address", models.CharField(blank=True, default="", max_length=160)),
                (
                    "primary_brand_color",
                    models.CharField(default="#0B1F3A", max_length=7),
                ),
                (
                    "secondary_brand_color",
                    models.CharField(default="#F97316", max_length=7),
                ),
                (
                    "business",
                    models.OneToOneField(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="profile",
                        to="workspaces.business",
                    ),
                ),
            ],
            options={"db_table": "workspaces_business_profiles"},
        ),
        migrations.CreateModel(
            name="BusinessSettings",
            fields=[
                (
                    "id",
                    models.UUIDField(
                        default=common.database.uuid.generate_uuid,
                        editable=False,
                        primary_key=True,
                        serialize=False,
                    ),
                ),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                ("is_deleted", models.BooleanField(db_index=True, default=False)),
                ("deleted_at", models.DateTimeField(blank=True, null=True)),
                (
                    "language_code",
                    models.CharField(
                        choices=[("en", "English"), ("sw", "Swahili")],
                        default="en",
                        max_length=2,
                    ),
                ),
                (
                    "timezone",
                    models.CharField(default="Africa/Dar_es_Salaam", max_length=64),
                ),
                (
                    "date_format",
                    models.CharField(
                        choices=[
                            ("DD/MM/YYYY", "DD/MM/YYYY"),
                            ("MM/DD/YYYY", "MM/DD/YYYY"),
                            ("YYYY-MM-DD", "YYYY-MM-DD"),
                        ],
                        default="DD/MM/YYYY",
                        max_length=10,
                    ),
                ),
                (
                    "time_format",
                    models.CharField(
                        choices=[("12h", "12-hour"), ("24h", "24-hour")],
                        default="24h",
                        max_length=3,
                    ),
                ),
                ("branding_enabled", models.BooleanField(default=True)),
                (
                    "business",
                    models.OneToOneField(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="settings",
                        to="workspaces.business",
                    ),
                ),
            ],
            options={"db_table": "workspaces_business_settings"},
        ),
        migrations.RunPython(
            create_business_management_records,
            migrations.RunPython.noop,
        ),
    ]
