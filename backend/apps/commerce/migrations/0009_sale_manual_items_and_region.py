from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):
    dependencies = [("commerce", "0008_stock_delivery_expense_audit")]

    operations = [
        migrations.AddField(
            model_name="sale",
            name="customer_region",
            field=models.CharField(blank=True, default="", max_length=120),
        ),
        migrations.AddField(
            model_name="saleitem",
            name="item_name",
            field=models.CharField(blank=True, default="", max_length=160),
        ),
        migrations.AddField(
            model_name="saleitem",
            name="source",
            field=models.CharField(
                choices=[("catalog", "TEED product / SKU"), ("manual", "Manual item")],
                default="catalog",
                max_length=12,
            ),
        ),
        migrations.AlterField(
            model_name="saleitem",
            name="product",
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.PROTECT,
                related_name="sale_items",
                to="commerce.product",
            ),
        ),
        migrations.AddField(
            model_name="saleitem",
            name="tracked_unit",
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.PROTECT,
                related_name="sale_items",
                to="commerce.trackedunit",
            ),
        ),
    ]
