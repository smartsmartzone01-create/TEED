import common.database.uuid
import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("website", "0011_listing_discover_story_blocks"),
    ]

    operations = [
        migrations.CreateModel(
            name="WebsiteOrder",
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
                ("order_number", models.CharField(blank=True, editable=False, max_length=20, unique=True)),
                (
                    "status",
                    models.CharField(
                        choices=[
                            ("new", "New"),
                            ("confirmed", "Confirmed"),
                            ("completed", "Completed"),
                            ("cancelled", "Cancelled"),
                        ],
                        db_index=True,
                        default="new",
                        max_length=16,
                    ),
                ),
                ("customer_full_name", models.CharField(max_length=120)),
                ("customer_phone", models.CharField(max_length=32)),
                ("customer_email", models.EmailField(blank=True, default="", max_length=254)),
                ("delivery_address", models.TextField()),
                ("note", models.TextField(blank=True, default="")),
                ("currency", models.CharField(default="TZS", max_length=3)),
                ("total", models.DecimalField(decimal_places=2, default=0, max_digits=14)),
                (
                    "site",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="orders",
                        to="website.websitesite",
                    ),
                ),
            ],
            options={
                "db_table": "website_orders",
                "ordering": ["-created_at", "-id"],
            },
        ),
        migrations.CreateModel(
            name="WebsiteOrderItem",
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
                ("offer_id", models.CharField(max_length=160)),
                ("product_slug", models.SlugField(max_length=120)),
                ("title", models.JSONField(default=dict)),
                ("sku", models.CharField(blank=True, default="", max_length=64)),
                ("options", models.JSONField(blank=True, default=dict)),
                ("image_url", models.URLField(blank=True, default="", max_length=500)),
                ("quantity", models.PositiveIntegerField()),
                ("unit_price", models.DecimalField(decimal_places=2, max_digits=14)),
                ("line_total", models.DecimalField(decimal_places=2, max_digits=14)),
                ("currency", models.CharField(default="TZS", max_length=3)),
                (
                    "listing",
                    models.ForeignKey(
                        blank=True,
                        null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        related_name="order_items",
                        to="website.websitelisting",
                    ),
                ),
                (
                    "order",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="items",
                        to="website.websiteorder",
                    ),
                ),
                (
                    "variant",
                    models.ForeignKey(
                        blank=True,
                        null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        related_name="order_items",
                        to="website.websitevariant",
                    ),
                ),
            ],
            options={
                "db_table": "website_order_items",
                "ordering": ["created_at", "id"],
            },
        ),
        migrations.AddConstraint(
            model_name="websiteorder",
            constraint=models.CheckConstraint(
                condition=models.Q(("total__gte", 0)),
                name="website_order_total_nonnegative",
            ),
        ),
        migrations.AddConstraint(
            model_name="websiteorderitem",
            constraint=models.CheckConstraint(
                condition=models.Q(("quantity__gte", 1)),
                name="website_order_item_quantity_positive",
            ),
        ),
        migrations.AddConstraint(
            model_name="websiteorderitem",
            constraint=models.CheckConstraint(
                condition=models.Q(("unit_price__gte", 0)),
                name="website_order_item_unit_price_nonnegative",
            ),
        ),
        migrations.AddConstraint(
            model_name="websiteorderitem",
            constraint=models.CheckConstraint(
                condition=models.Q(("line_total__gte", 0)),
                name="website_order_item_line_total_nonnegative",
            ),
        ),
    ]
