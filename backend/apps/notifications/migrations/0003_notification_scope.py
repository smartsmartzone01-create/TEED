from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [("notifications", "0002_alter_usernotification_template")]

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
                    ("system_announcement", "System announcement"),
                ],
                db_index=True,
                max_length=48,
            ),
        ),
        migrations.AddField(
            model_name="usernotification",
            name="business_id",
            field=models.UUIDField(blank=True, db_index=True, null=True),
        ),
        migrations.AddField(
            model_name="usernotification",
            name="scope",
            field=models.CharField(
                choices=[
                    ("personal", "Personal"),
                    ("membership", "Membership"),
                    ("workspace", "Workspace governance"),
                    ("cross_business", "Cross-business"),
                ],
                db_index=True,
                default="personal",
                max_length=24,
            ),
        ),
    ]
