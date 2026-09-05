import apps.website.models
import common.database.uuid
import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):
    initial = True

    dependencies = [
        ("commerce", "0018_financing_agreements"),
        ("workspaces", "0005_business_deletion_schedule"),
    ]

    operations = [
        migrations.CreateModel(
            name="WebsiteSite",
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
                    "public_key",
                    models.UUIDField(
                        default=common.database.uuid.generate_uuid,
                        editable=False,
                        unique=True,
                    ),
                ),
                ("slug", models.SlugField(max_length=80)),
                ("display_name", models.CharField(max_length=120)),
                (
                    "default_locale",
                    models.CharField(
                        choices=[("en", "English"), ("sw", "Swahili")],
                        default="en",
                        max_length=2,
                    ),
                ),
                (
                    "supported_locales",
                    models.JSONField(default=apps.website.models.default_supported_locales),
                ),
                ("primary_color", models.CharField(default="#0B1F3A", max_length=7)),
                ("surface_color", models.CharField(default="#FFFFFF", max_length=7)),
                ("text_color", models.CharField(default="#111827", max_length=7)),
                ("contact_phone", models.CharField(blank=True, default="", max_length=32)),
                ("contact_email", models.EmailField(blank=True, default="", max_length=254)),
                ("contact_whatsapp", models.CharField(blank=True, default="", max_length=32)),
                ("contact_instagram", models.CharField(blank=True, default="", max_length=120)),
                ("navigation", models.JSONField(blank=True, default=list)),
                ("hero", models.JSONField(blank=True, default=dict)),
                ("services", models.JSONField(blank=True, default=list)),
                ("newsletter", models.JSONField(blank=True, default=dict)),
                ("is_published", models.BooleanField(db_index=True, default=False)),
                (
                    "business",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="website_sites",
                        to="workspaces.business",
                    ),
                ),
            ],
            options={
                "db_table": "website_sites",
                "ordering": ["display_name", "id"],
            },
        ),
        migrations.CreateModel(
            name="WebsiteListing",
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
                ("slug", models.SlugField(max_length=120)),
                ("title", models.JSONField(default=dict)),
                ("short_description", models.JSONField(blank=True, default=dict)),
                ("description", models.JSONField(blank=True, default=dict)),
                ("brand", models.CharField(blank=True, default="", max_length=80)),
                ("badge", models.JSONField(blank=True, default=dict)),
                ("primary_image_url", models.URLField(blank=True, default="", max_length=500)),
                ("options", models.JSONField(blank=True, default=list)),
                ("is_published", models.BooleanField(db_index=True, default=False)),
                ("sort_order", models.PositiveIntegerField(db_index=True, default=0)),
                (
                    "site",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="listings",
                        to="website.websitesite",
                    ),
                ),
            ],
            options={
                "db_table": "website_listings",
                "ordering": ["sort_order", "created_at", "id"],
            },
        ),
        migrations.CreateModel(
            name="WebsiteVariant",
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
                ("sku", models.CharField(blank=True, default="", max_length=64)),
                ("options", models.JSONField(blank=True, default=dict)),
                (
                    "website_price",
                    models.DecimalField(
                        blank=True,
                        decimal_places=2,
                        max_digits=14,
                        null=True,
                    ),
                ),
                ("currency", models.CharField(default="TZS", max_length=3)),
                (
                    "website_availability",
                    models.CharField(
                        choices=[
                            ("in_stock", "In stock"),
                            ("low_stock", "Low stock"),
                            ("out_of_stock", "Out of stock"),
                        ],
                        default="in_stock",
                        max_length=16,
                    ),
                ),
                ("image_url", models.URLField(blank=True, default="", max_length=500)),
                (
                    "price_source",
                    models.CharField(
                        choices=[("website", "Website"), ("commerce", "Commerce")],
                        default="website",
                        max_length=16,
                    ),
                ),
                (
                    "availability_source",
                    models.CharField(
                        choices=[("website", "Website"), ("commerce", "Commerce")],
                        default="website",
                        max_length=16,
                    ),
                ),
                ("is_published", models.BooleanField(db_index=True, default=True)),
                ("sort_order", models.PositiveIntegerField(db_index=True, default=0)),
                (
                    "commerce_product",
                    models.ForeignKey(
                        blank=True,
                        null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        related_name="website_variants",
                        to="commerce.product",
                    ),
                ),
                (
                    "listing",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="variants",
                        to="website.websitelisting",
                    ),
                ),
            ],
            options={
                "db_table": "website_variants",
                "ordering": ["sort_order", "created_at", "id"],
            },
        ),
        migrations.AddConstraint(
            model_name="websitesite",
            constraint=models.UniqueConstraint(
                fields=("business", "slug"),
                name="website_business_site_slug_unique",
            ),
        ),
        migrations.AddConstraint(
            model_name="websitelisting",
            constraint=models.UniqueConstraint(
                fields=("site", "slug"),
                name="website_site_listing_slug_unique",
            ),
        ),
        migrations.AddConstraint(
            model_name="websitevariant",
            constraint=models.UniqueConstraint(
                condition=~models.Q(sku=""),
                fields=("listing", "sku"),
                name="website_listing_sku_unique",
            ),
        ),
        migrations.AddConstraint(
            model_name="websitevariant",
            constraint=models.CheckConstraint(
                condition=models.Q(website_price__isnull=True)
                | models.Q(website_price__gte=0),
                name="website_variant_price_nonnegative",
            ),
        ),
    ]
