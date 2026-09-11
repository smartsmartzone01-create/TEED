from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("commerce", "0019_stock_receipt_name_product_family"),
    ]

    operations = [
        migrations.AddField(
            model_name="product",
            name="variant_options",
            field=models.JSONField(blank=True, default=list),
        ),
    ]
