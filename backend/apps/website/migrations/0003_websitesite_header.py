from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("website", "0002_websitemedia_listing_variant_media"),
    ]

    operations = [
        migrations.AddField(
            model_name="websitesite",
            name="header",
            field=models.JSONField(blank=True, default=dict),
        ),
    ]
