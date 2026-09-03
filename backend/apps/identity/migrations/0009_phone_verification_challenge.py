import common.database.uuid
import django.db.models.deletion
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("identity", "0008_security_access"),
    ]

    operations = [
        migrations.CreateModel(
            name="PhoneVerificationChallenge",
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
                    "purpose",
                    models.CharField(
                        choices=[
                            ("registration", "Registration"),
                            ("password_reset", "Password reset"),
                        ],
                        default="registration",
                        max_length=32,
                    ),
                ),
                ("code_digest", models.CharField(max_length=128)),
                ("expires_at", models.DateTimeField()),
                ("attempt_count", models.PositiveSmallIntegerField(default=0)),
                ("max_attempts", models.PositiveSmallIntegerField(default=5)),
                ("consumed_at", models.DateTimeField(blank=True, null=True)),
                (
                    "user",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="phone_verification_challenges",
                        to=settings.AUTH_USER_MODEL,
                    ),
                ),
            ],
            options={
                "db_table": "identity_phone_verification_challenges",
                "ordering": ["-created_at"],
                "indexes": [
                    models.Index(
                        fields=["user", "purpose", "consumed_at"],
                        name="identity_phone_challenge_idx",
                    )
                ],
                "constraints": [
                    models.CheckConstraint(
                        condition=models.Q(
                            ("attempt_count__lte", models.F("max_attempts"))
                        ),
                        name="identity_phone_attempt_limit",
                    )
                ],
            },
        ),
        migrations.AlterField(
            model_name="identitysecurityevent",
            name="event_type",
            field=models.CharField(
                choices=[
                    ("email_challenge_issued", "Email challenge issued"),
                    ("email_delivery_succeeded", "Email delivery succeeded"),
                    ("email_delivery_failed", "Email delivery failed"),
                    ("email_delivery_queued", "Email delivery queued"),
                    ("email_delivery_retry", "Email delivery retry"),
                    ("email_delivery_dead", "Email delivery dead letter"),
                    ("email_verification_succeeded", "Email verification succeeded"),
                    ("email_verification_failed", "Email verification failed"),
                    ("email_resend_blocked", "Email resend blocked"),
                    ("phone_challenge_issued", "Phone challenge issued"),
                    ("phone_delivery_succeeded", "Phone delivery succeeded"),
                    ("phone_delivery_failed", "Phone delivery failed"),
                    ("phone_verification_succeeded", "Phone verification succeeded"),
                    ("phone_verification_failed", "Phone verification failed"),
                    ("phone_resend_blocked", "Phone resend blocked"),
                    ("login_succeeded", "Login succeeded"),
                    ("login_failed", "Login failed"),
                    ("registration_succeeded", "Registration succeeded"),
                    ("registration_failed", "Registration failed"),
                    ("password_reset_requested", "Password reset requested"),
                    ("password_reset_request_blocked", "Password reset request blocked"),
                    ("password_reset_code_succeeded", "Password reset code succeeded"),
                    ("password_reset_code_failed", "Password reset code failed"),
                    ("password_reset_succeeded", "Password reset succeeded"),
                    ("password_reset_failed", "Password reset failed"),
                    ("profile_updated", "Profile updated"),
                    ("profile_image_removed", "Profile image removed"),
                    ("password_changed", "Password changed"),
                    ("session_revoked", "Session revoked"),
                    ("other_sessions_revoked", "Other sessions revoked"),
                ],
                db_index=True,
                max_length=64,
            ),
        ),
    ]
