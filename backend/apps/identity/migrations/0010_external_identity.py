import common.database.uuid
import django.db.models.deletion
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("identity", "0009_phone_verification_challenge"),
    ]

    operations = [
        migrations.CreateModel(
            name="ExternalIdentity",
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
                ("is_deleted", models.BooleanField(db_index=True, default=False)),
                ("deleted_at", models.DateTimeField(blank=True, null=True)),
                (
                    "provider",
                    models.CharField(
                        choices=[("google", "Google")],
                        max_length=32,
                    ),
                ),
                ("subject", models.CharField(max_length=255)),
                (
                    "email_snapshot",
                    models.EmailField(
                        blank=True,
                        default="",
                        max_length=254,
                    ),
                ),
                (
                    "user",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="external_identities",
                        to=settings.AUTH_USER_MODEL,
                    ),
                ),
            ],
            options={
                "db_table": "identity_external_identities",
                "ordering": ["-created_at"],
                "constraints": [
                    models.UniqueConstraint(
                        condition=models.Q(("is_deleted", False)),
                        fields=("provider", "subject"),
                        name="identity_ext_subject_unique",
                    ),
                    models.UniqueConstraint(
                        condition=models.Q(("is_deleted", False)),
                        fields=("user", "provider"),
                        name="identity_ext_user_provider",
                    ),
                ],
            },
        ),
    ]
