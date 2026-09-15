from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("website", "0008_websitevariant_sku_default"),
    ]

    operations = [
        migrations.AddField(
            model_name="websitelisting",
            name="published_at",
            field=models.DateTimeField(blank=True, db_index=True, null=True),
        ),
        migrations.AddField(
            model_name="websitelisting",
            name="detail_view_count",
            field=models.PositiveBigIntegerField(db_index=True, default=0),
        ),
    ]
