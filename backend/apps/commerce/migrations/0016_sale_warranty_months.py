from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("commerce", "0015_budget_period_planning"),
    ]

    operations = [
        migrations.AddField(
            model_name="sale",
            name="warranty_months",
            field=models.PositiveSmallIntegerField(
                blank=True,
                choices=[
                    (3, "3 months"),
                    (6, "6 months"),
                    (12, "12 months"),
                    (24, "24 months"),
                ],
                null=True,
            ),
        ),
    ]
