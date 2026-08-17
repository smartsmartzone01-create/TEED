import common.database.uuid
import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [("commerce", "0010_sale_mode_and_independent_details")]

    operations = [
        migrations.AddField(
            model_name="sale",
            name="transaction_type",
            field=models.CharField(
                choices=[("normal", "Normal sale"), ("trade_in", "Trade-in")],
                db_index=True,
                default="normal",
                max_length=16,
            ),
        ),
        migrations.AlterField(
            model_name="sale",
            name="sale_mode",
            field=models.CharField(
                choices=[
                    ("stock", "From stock"),
                    ("independent", "Independent sale"),
                    ("trade_in", "Trade-in (legacy)"),
                ],
                db_index=True,
                default="stock",
                max_length=16,
            ),
        ),
        migrations.CreateModel(
            name="TradeInDetail",
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
                ("incoming_item_name", models.CharField(max_length=160)),
                ("incoming_item_details", models.JSONField(blank=True, default=dict)),
                ("incoming_value", models.DecimalField(decimal_places=2, max_digits=14)),
                ("cash_top_up", models.DecimalField(decimal_places=2, max_digits=14)),
                ("add_to_stock", models.BooleanField(default=False)),
                ("stock_group_name", models.CharField(blank=True, default="", max_length=120)),
                (
                    "sale",
                    models.OneToOneField(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="trade_in_detail",
                        to="commerce.sale",
                    ),
                ),
                (
                    "stock_product",
                    models.ForeignKey(
                        blank=True,
                        null=True,
                        on_delete=django.db.models.deletion.PROTECT,
                        related_name="trade_in_acquisitions",
                        to="commerce.product",
                    ),
                ),
                (
                    "stock_receipt",
                    models.ForeignKey(
                        blank=True,
                        null=True,
                        on_delete=django.db.models.deletion.PROTECT,
                        related_name="trade_in_details",
                        to="commerce.stockreceipt",
                    ),
                ),
            ],
            options={"db_table": "commerce_trade_in_details"},
        ),
    ]
