from django.db import migrations, models

import apps.website.models


class Migration(migrations.Migration):
    dependencies = [
        ("website", "0007_websitevariant_commerce_connected"),
    ]

    operations = [
        migrations.AlterField(
            model_name="websitevariant",
            name="sku",
            field=models.CharField(
                blank=True,
                default=apps.website.models.generate_website_variant_sku,
                max_length=64,
            ),
        ),
    ]
