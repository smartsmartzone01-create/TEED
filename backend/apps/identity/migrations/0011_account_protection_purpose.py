from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("identity", "0010_external_identity"),
    ]

    operations = [
        migrations.AlterField(
            model_name="emailverificationchallenge",
            name="purpose",
            field=models.CharField(
                choices=[
                    ("registration", "Registration"),
                    ("password_reset", "Password reset"),
                    ("account_protection", "Account protection"),
                ],
                default="registration",
                max_length=32,
            ),
        ),
        migrations.AlterField(
            model_name="phoneverificationchallenge",
            name="purpose",
            field=models.CharField(
                choices=[
                    ("registration", "Registration"),
                    ("password_reset", "Password reset"),
                    ("account_protection", "Account protection"),
                ],
                default="registration",
                max_length=32,
            ),
        ),
    ]
