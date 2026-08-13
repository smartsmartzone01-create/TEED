from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [("workspaces", "0004_workspace_type_policy_and_category")]

    operations = [
        migrations.AddField(
            model_name="business",
            name="deletion_scheduled_for",
            field=models.DateTimeField(blank=True, db_index=True, null=True),
        ),
    ]
