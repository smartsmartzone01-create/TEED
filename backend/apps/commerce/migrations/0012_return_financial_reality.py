import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("commerce", "0011_trade_in_transaction_details"),
    ]

    operations = [
        migrations.AddField(
            model_name="salereturn",
            name="credit_amount",
            field=models.DecimalField(decimal_places=2, default=0, max_digits=14),
        ),
        migrations.AddField(
            model_name="salereturn",
            name="damaged_loss",
            field=models.DecimalField(decimal_places=2, default=0, max_digits=14),
        ),
        migrations.AddField(
            model_name="salereturn",
            name="recovered_inventory_cost",
            field=models.DecimalField(decimal_places=2, default=0, max_digits=14),
        ),
        migrations.AddField(
            model_name="salereturn",
            name="refund_amount",
            field=models.DecimalField(decimal_places=2, default=0, max_digits=14),
        ),
        migrations.AddField(
            model_name="salereturn",
            name="replacement_cost",
            field=models.DecimalField(decimal_places=2, default=0, max_digits=14),
        ),
        migrations.AddField(
            model_name="salereturn",
            name="return_number",
            field=models.CharField(blank=True, default="", max_length=48),
        ),
        migrations.AddField(
            model_name="salereturn",
            name="return_sequence",
            field=models.PositiveBigIntegerField(default=0),
        ),
        migrations.CreateModel(
            name="ReturnReplacement",
            fields=[
                (
                    "id",
                    models.UUIDField(
                        editable=False,
                        primary_key=True,
                        serialize=False,
                    ),
                ),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                (
                    "source",
                    models.CharField(
                        choices=[("stock", "From stock"), ("independent", "Independent")],
                        max_length=16,
                    ),
                ),
                ("item_name", models.CharField(blank=True, default="", max_length=160)),
                ("item_details", models.JSONField(blank=True, default=dict)),
                ("quantity", models.DecimalField(decimal_places=3, max_digits=14)),
                (
                    "acquisition_unit_cost",
                    models.DecimalField(
                        blank=True,
                        decimal_places=2,
                        max_digits=14,
                        null=True,
                    ),
                ),
                ("cost_total", models.DecimalField(decimal_places=2, default=0, max_digits=14)),
                (
                    "product",
                    models.ForeignKey(
                        blank=True,
                        null=True,
                        on_delete=django.db.models.deletion.PROTECT,
                        related_name="return_replacements",
                        to="commerce.product",
                    ),
                ),
                (
                    "return_record",
                    models.OneToOneField(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="replacement",
                        to="commerce.salereturn",
                    ),
                ),
                (
                    "tracked_unit",
                    models.ForeignKey(
                        blank=True,
                        null=True,
                        on_delete=django.db.models.deletion.PROTECT,
                        related_name="return_replacements",
                        to="commerce.trackedunit",
                    ),
                ),
            ],
            options={"db_table": "commerce_return_replacements"},
        ),
        migrations.CreateModel(
            name="ReturnReplacementAllocation",
            fields=[
                (
                    "id",
                    models.UUIDField(
                        editable=False,
                        primary_key=True,
                        serialize=False,
                    ),
                ),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                ("quantity", models.DecimalField(decimal_places=3, max_digits=14)),
                ("unit_cost", models.DecimalField(decimal_places=2, max_digits=14)),
                (
                    "batch",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.PROTECT,
                        related_name="return_replacement_allocations",
                        to="commerce.stockbatch",
                    ),
                ),
                (
                    "replacement",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="allocations",
                        to="commerce.returnreplacement",
                    ),
                ),
            ],
            options={"db_table": "commerce_return_replacement_allocations"},
        ),
    ]
