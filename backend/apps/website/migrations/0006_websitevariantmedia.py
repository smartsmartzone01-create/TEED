import common.database.uuid
import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("website", "0005_websitesite_categories"),
    ]

    operations = [
        migrations.CreateModel(
            name="WebsiteVariantMedia",
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
                ("sort_order", models.PositiveIntegerField(db_index=True, default=0)),
                (
                    "media",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="variant_gallery_items",
                        to="website.websitemedia",
                    ),
                ),
                (
                    "variant",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="gallery_items",
                        to="website.websitevariant",
                    ),
                ),
            ],
            options={
                "db_table": "website_variant_media",
                "ordering": ["sort_order", "created_at", "id"],
            },
        ),
        migrations.AddConstraint(
            model_name="websitevariantmedia",
            constraint=models.UniqueConstraint(
                fields=("variant", "media"),
                name="website_variant_media_unique",
            ),
        ),
    ]
