import common.database.uuid
import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("website", "0010_align_mixed_family_option_keys"),
    ]

    operations = [
        migrations.AddField(
            model_name="websitelisting",
            name="discover_media",
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name="discover_for_listings",
                to="website.websitemedia",
            ),
        ),
        migrations.CreateModel(
            name="WebsiteListingStoryBlock",
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
                ("heading", models.JSONField(blank=True, default=dict)),
                ("body", models.JSONField(blank=True, default=dict)),
                ("sort_order", models.PositiveIntegerField(db_index=True, default=0)),
                (
                    "listing",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="story_blocks",
                        to="website.websitelisting",
                    ),
                ),
                (
                    "media",
                    models.ForeignKey(
                        blank=True,
                        null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        related_name="listing_story_blocks",
                        to="website.websitemedia",
                    ),
                ),
            ],
            options={
                "db_table": "website_listing_story_blocks",
                "ordering": ["sort_order", "created_at", "id"],
            },
        ),
    ]
