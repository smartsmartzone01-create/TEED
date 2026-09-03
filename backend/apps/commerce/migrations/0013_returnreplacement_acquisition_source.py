from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("commerce", "0012_return_financial_reality"),
    ]

    operations = [
        migrations.AddField(
            model_name="returnreplacement",
            name="acquisition_source",
            field=models.CharField(blank=True, default="", max_length=160),
        ),
    ]
