from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("website", "0004_websitesite_featured_products"),
    ]

    operations = [
        migrations.AddField(
            model_name="websitesite",
            name="categories",
            field=models.JSONField(blank=True, default=dict),
        ),
    ]
