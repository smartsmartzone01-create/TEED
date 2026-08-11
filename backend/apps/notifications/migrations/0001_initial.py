import common.database.uuid
import django.db.models.deletion
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):
    initial = True
    dependencies = [
        ("identity", "0008_security_access"),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]
    operations = [
        migrations.CreateModel(
            name="UserNotification",
            fields=[
                (
                    "id",
                    models.UUIDField(
                        default=common.database.uuid.generate_uuid,
                        editable=False,
                        primary_key=True,
                        serialize=False,
                    ),
                ),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                (
                    "deleted_at",
                    models.DateTimeField(blank=True, null=True),
                ),
                ("is_deleted", models.BooleanField(db_index=True, default=False)),
                (
                    "category",
                    models.CharField(
                        choices=[
                            ("security", "Security"),
                            ("account", "Account"),
                            ("workspace", "Workspace"),
                            ("system", "System"),
                        ],
                        db_index=True,
                        max_length=24,
                    ),
                ),
                (
                    "template",
                    models.CharField(
                        choices=[
                            ("password_changed", "Password changed"),
                            ("session_revoked", "Session revoked"),
                            ("other_sessions_revoked", "Other sessions revoked"),
                            ("workspace_invitation", "Workspace invitation"),
                            ("system_announcement", "System announcement"),
                        ],
                        db_index=True,
                        max_length=48,
                    ),
                ),
                ("context", models.JSONField(blank=True, default=dict)),
                (
                    "action_path",
                    models.CharField(blank=True, default="", max_length=240),
                ),
                ("read_at", models.DateTimeField(blank=True, db_index=True, null=True)),
                (
                    "expires_at",
                    models.DateTimeField(blank=True, db_index=True, null=True),
                ),
                (
                    "deduplication_key",
                    models.CharField(blank=True, default="", max_length=120),
                ),
                (
                    "user",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="notifications",
                        to=settings.AUTH_USER_MODEL,
                    ),
                ),
            ],
            options={
                "db_table": "notifications_user_notifications",
                "ordering": ["-created_at"],
            },
        ),
        migrations.AddIndex(
            model_name="usernotification",
            index=models.Index(
                fields=["user", "read_at", "created_at"],
                name="notification_user_unread_idx",
            ),
        ),
        migrations.AddConstraint(
            model_name="usernotification",
            constraint=models.UniqueConstraint(
                condition=~models.Q(deduplication_key=""),
                fields=("user", "deduplication_key"),
                name="notification_user_dedupe_unique",
            ),
        ),
    ]
