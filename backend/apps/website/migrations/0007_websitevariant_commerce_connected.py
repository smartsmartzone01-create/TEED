from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("website", "0006_websitevariantmedia"),
    ]

    operations = [
        migrations.AddField(
            model_name="websitevariant",
            name="commerce_connected",
            field=models.BooleanField(db_index=True, default=True),
        ),
    ]
