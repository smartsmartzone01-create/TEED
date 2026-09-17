import common.database.uuid
import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("identity", "0014_storefront_customer_password_reset_grant"),
        ("workspaces", "0005_business_deletion_schedule"),
    ]

    operations = [
        migrations.CreateModel(
            name="StorefrontCustomerExternalIdentity",
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
                    "provider",
                    models.CharField(
                        choices=[("google", "Google")],
                        max_length=32,
                    ),
                ),
                ("subject", models.CharField(max_length=255)),
                (
                    "email_snapshot",
                    models.EmailField(blank=True, default="", max_length=254),
                ),
                (
                    "business",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="storefront_customer_external_identities",
                        to="workspaces.business",
                    ),
                ),
                (
                    "customer",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="external_identities",
                        to="identity.storefrontcustomer",
                    ),
                ),
            ],
            options={
                "db_table": "identity_storefront_customer_external_identities",
                "ordering": ["-created_at"],
                "constraints": [
                    models.UniqueConstraint(
                        condition=models.Q(is_deleted=False),
                        fields=("business", "provider", "subject"),
                        name="identity_sf_ext_subject_uniq",
                    ),
                    models.UniqueConstraint(
                        condition=models.Q(is_deleted=False),
                        fields=("customer", "provider"),
                        name="identity_sf_ext_customer_uniq",
                    ),
                ],
            },
        ),
    ]
