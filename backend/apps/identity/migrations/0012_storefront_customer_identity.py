import common.database.uuid
import django.db.models.deletion
import django.db.models.functions.text
import django.utils.timezone
from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("identity", "0011_account_protection_purpose"),
    ]

    operations = [
        migrations.CreateModel(
            name="StorefrontCustomer",
            fields=[
                (
                    "password",
                    models.CharField(max_length=128, verbose_name="password"),
                ),
                (
                    "last_login",
                    models.DateTimeField(
                        blank=True,
                        null=True,
                        verbose_name="last login",
                    ),
                ),
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
                    "email",
                    models.EmailField(
                        blank=True,
                        max_length=254,
                        null=True,
                        unique=True,
                    ),
                ),
                (
                    "phone_number",
                    models.CharField(
                        blank=True,
                        max_length=16,
                        null=True,
                        unique=True,
                    ),
                ),
                ("first_name", models.CharField(blank=True, max_length=150)),
                ("last_name", models.CharField(blank=True, max_length=150)),
                ("is_active", models.BooleanField(default=True)),
                ("is_email_verified", models.BooleanField(default=False)),
                ("is_phone_verified", models.BooleanField(default=False)),
            ],
            options={
                "db_table": "identity_storefront_customers",
                "ordering": ["-created_at"],
                "constraints": [
                    models.UniqueConstraint(
                        django.db.models.functions.text.Lower("email"),
                        condition=models.Q(email__isnull=False),
                        name="identity_sf_email_ci_uniq",
                    ),
                    models.CheckConstraint(
                        condition=(
                            models.Q(email__isnull=False)
                            | models.Q(phone_number__isnull=False)
                        ),
                        name="identity_sf_identifier_present",
                    ),
                ],
            },
        ),
        migrations.CreateModel(
            name="StorefrontCustomerVerificationChallenge",
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
                    "channel",
                    models.CharField(
                        choices=[("email", "Email"), ("phone", "Phone")],
                        max_length=16,
                    ),
                ),
                (
                    "purpose",
                    models.CharField(
                        choices=[
                            ("registration", "Registration"),
                            ("password_reset", "Password reset"),
                            ("account_protection", "Account protection"),
                        ],
                        default="registration",
                        max_length=32,
                    ),
                ),
                ("destination", models.CharField(max_length=254)),
                ("code_digest", models.CharField(max_length=128)),
                ("expires_at", models.DateTimeField()),
                ("attempt_count", models.PositiveSmallIntegerField(default=0)),
                ("max_attempts", models.PositiveSmallIntegerField(default=5)),
                ("consumed_at", models.DateTimeField(blank=True, null=True)),
                (
                    "customer",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="verification_challenges",
                        to="identity.storefrontcustomer",
                    ),
                ),
            ],
            options={
                "db_table": "identity_storefront_customer_verification_challenges",
                "ordering": ["-created_at"],
                "indexes": [
                    models.Index(
                        fields=[
                            "customer",
                            "channel",
                            "purpose",
                            "consumed_at",
                        ],
                        name="identity_sf_challenge_idx",
                    )
                ],
                "constraints": [
                    models.CheckConstraint(
                        condition=models.Q(
                            attempt_count__lte=models.F("max_attempts")
                        ),
                        name="identity_sf_attempt_limit",
                    )
                ],
            },
        ),
        migrations.CreateModel(
            name="StorefrontCustomerSession",
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
                    "family_id",
                    models.UUIDField(
                        db_index=True,
                        default=common.database.uuid.generate_uuid,
                        editable=False,
                    ),
                ),
                (
                    "current_refresh_jti",
                    models.UUIDField(blank=True, null=True, unique=True),
                ),
                ("expires_at", models.DateTimeField(db_index=True)),
                (
                    "last_seen_at",
                    models.DateTimeField(default=django.utils.timezone.now),
                ),
                (
                    "revoked_at",
                    models.DateTimeField(blank=True, db_index=True, null=True),
                ),
                (
                    "revoke_reason",
                    models.CharField(
                        blank=True,
                        choices=[
                            ("logout", "Logout"),
                            ("logout_all", "Logout all"),
                            ("refresh_reuse", "Refresh token reuse"),
                            ("customer_inactive", "Customer inactive"),
                            ("expired", "Expired"),
                            ("security_event", "Security event"),
                            ("password_reset", "Password reset"),
                            ("password_change", "Password change"),
                            ("customer_revoked", "Revoked by customer"),
                        ],
                        default="",
                        max_length=32,
                    ),
                ),
                (
                    "ip_address",
                    models.GenericIPAddressField(blank=True, null=True),
                ),
                (
                    "device_id",
                    models.UUIDField(blank=True, db_index=True, null=True),
                ),
                (
                    "user_agent_hash",
                    models.CharField(blank=True, default="", max_length=64),
                ),
                (
                    "device_label",
                    models.CharField(blank=True, default="", max_length=80),
                ),
                (
                    "browser",
                    models.CharField(blank=True, default="", max_length=40),
                ),
                (
                    "operating_system",
                    models.CharField(blank=True, default="", max_length=40),
                ),
                (
                    "customer",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="sessions",
                        to="identity.storefrontcustomer",
                    ),
                ),
            ],
            options={
                "db_table": "identity_storefront_customer_sessions",
                "ordering": ["-created_at"],
                "indexes": [
                    models.Index(
                        fields=["customer", "revoked_at", "expires_at"],
                        name="identity_sf_session_active_idx",
                    )
                ],
            },
        ),
    ]
