from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [("commerce", "0009_sale_manual_items_and_region")]

    operations = [
        migrations.AddField(
            model_name="sale",
            name="sale_mode",
            field=models.CharField(
                choices=[
                    ("stock", "From stock"),
                    ("independent", "Independent sale"),
                    ("trade_in", "Trade-in"),
                ],
                db_index=True,
                default="stock",
                max_length=16,
            ),
        ),
        migrations.AddField(
            model_name="saleitem",
            name="item_details",
            field=models.JSONField(blank=True, default=dict),
        ),
        migrations.AddField(
            model_name="saleitem",
            name="acquisition_unit_cost",
            field=models.DecimalField(
                blank=True,
                decimal_places=2,
                max_digits=14,
                null=True,
            ),
        ),
        migrations.AlterField(
            model_name="saleitem",
            name="source",
            field=models.CharField(
                choices=[
                    ("catalog", "TEED product / SKU"),
                    ("manual", "Independent item"),
                ],
                default="catalog",
                max_length=12,
            ),
        ),
    ]
