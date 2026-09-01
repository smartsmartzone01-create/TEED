from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [("notifications", "0004_commerce_notification_templates")]

    operations = [
        migrations.AlterField(
            model_name="usernotification",
            name="template",
            field=models.CharField(
                choices=[
                    ("password_changed", "Password changed"),
                    ("session_revoked", "Session revoked"),
                    ("other_sessions_revoked", "Other sessions revoked"),
                    ("workspace_invitation", "Workspace invitation"),
                    ("workspace_access_request", "Workspace access request"),
                    ("workspace_access_decision", "Workspace access decision"),
                    ("workspace_membership_changed", "Workspace membership changed"),
                    ("business_control_request", "Business control request"),
                    ("business_control_decision", "Business control decision"),
                    ("commerce_sold_out", "Commerce item sold out"),
                    ("commerce_low_stock", "Commerce item low stock"),
                    ("commerce_financing_due", "Commerce financing payment due"),
                    ("system_announcement", "System announcement"),
                ],
                db_index=True,
                max_length=48,
            ),
        ),
    ]
