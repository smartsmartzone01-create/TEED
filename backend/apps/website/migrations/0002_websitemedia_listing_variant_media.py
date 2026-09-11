import common.database.uuid
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):
    dependencies = [
        ("website", "0001_initial"),
    ]

    operations = [
        migrations.CreateModel(
            name="WebsiteMedia",
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
                ("created_at", models.DateTimeField(auto_now_add=True, editable=False)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                ("is_deleted", models.BooleanField(db_index=True, default=False)),
                ("deleted_at", models.DateTimeField(blank=True, null=True)),
                (
                    "kind",
                    models.CharField(
                        choices=[("image", "Image")],
                        default="image",
                        max_length=16,
                    ),
                ),
                ("public_url", models.URLField(max_length=500)),
                ("storage_key", models.CharField(blank=True, default="", max_length=500)),
                ("original_name", models.CharField(blank=True, default="", max_length=255)),
                ("mime_type", models.CharField(blank=True, default="", max_length=100)),
                ("alt_text", models.JSONField(blank=True, default=dict)),
                ("width", models.PositiveIntegerField(blank=True, null=True)),
                ("height", models.PositiveIntegerField(blank=True, null=True)),
                ("size_bytes", models.PositiveBigIntegerField(blank=True, null=True)),
                ("sort_order", models.PositiveIntegerField(db_index=True, default=0)),
                (
                    "site",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="media",
                        to="website.websitesite",
                    ),
                ),
            ],
            options={
                "db_table": "website_media",
                "ordering": ["sort_order", "created_at", "id"],
            },
        ),
        migrations.AddField(
            model_name="websitelisting",
            name="primary_media",
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name="primary_for_listings",
                to="website.websitemedia",
            ),
        ),
        migrations.AddField(
            model_name="websitevariant",
            name="media",
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name="variant_usages",
                to="website.websitemedia",
            ),
        ),
    ]
