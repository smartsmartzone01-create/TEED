# Generated for the Stock v2 domain relationship.

import common.database.uuid
import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("commerce", "0018_financing_agreements"),
    ]

    operations = [
        migrations.CreateModel(
            name="ProductFamily",
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
                ("name", models.CharField(max_length=120)),
                ("brand", models.CharField(blank=True, default="", max_length=80)),
                ("is_active", models.BooleanField(db_index=True, default=True)),
                (
                    "business",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="product_families",
                        to="workspaces.business",
                    ),
                ),
            ],
            options={
                "db_table": "commerce_product_families",
                "ordering": ["name", "brand", "id"],
            },
        ),
        migrations.AddField(
            model_name="stockreceipt",
            name="name",
            field=models.CharField(blank=True, default="", max_length=120),
        ),
        migrations.AddField(
            model_name="product",
            name="family",
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.PROTECT,
                related_name="products",
                to="commerce.productfamily",
            ),
        ),
        migrations.AddConstraint(
            model_name="productfamily",
            constraint=models.UniqueConstraint(
                fields=("business", "name", "brand"),
                name="commerce_business_product_family_unique",
            ),
        ),
    ]