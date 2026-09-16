from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("website", "0003_websitesite_header"),
    ]

    operations = [
        migrations.AddField(
            model_name="websitesite",
            name="featured_products",
            field=models.JSONField(blank=True, default=dict),
        ),
    ]
