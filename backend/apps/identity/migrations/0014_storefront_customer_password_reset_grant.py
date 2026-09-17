import common.database.uuid
import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("identity", "0013_storefront_customer_business_scope"),
    ]

    operations = [
        migrations.CreateModel(
            name="StorefrontCustomerPasswordResetGrant",
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
                ("challenge_id", models.UUIDField(db_index=True)),
                ("token_digest", models.CharField(max_length=64, unique=True)),
                ("expires_at", models.DateTimeField(db_index=True)),
                (
                    "consumed_at",
                    models.DateTimeField(blank=True, db_index=True, null=True),
                ),
                ("device_id", models.UUIDField(blank=True, null=True)),
                (
                    "customer",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="password_reset_grants",
                        to="identity.storefrontcustomer",
                    ),
                ),
            ],
            options={
                "db_table": "identity_storefront_customer_password_reset_grants",
                "ordering": ["-created_at"],
                "indexes": [
                    models.Index(
                        fields=["customer", "consumed_at", "expires_at"],
                        name="identity_sf_reset_grant_idx",
                    ),
                ],
            },
        ),
    ]
