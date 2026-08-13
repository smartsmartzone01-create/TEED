from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [("commerce", "0001_initial")]

    operations = [
        migrations.AddField(
            model_name="returnitem",
            name="cost_total",
            field=models.DecimalField(decimal_places=2, default=0, max_digits=14),
        ),
    ]
