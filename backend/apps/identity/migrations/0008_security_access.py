from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [("identity", "0007_alter_identitysecurityevent_event_type")]

    operations = [
        migrations.AddField(
            model_name="usersession",
            name="browser",
            field=models.CharField(blank=True, default="", max_length=40),
        ),
        migrations.AddField(
            model_name="usersession",
            name="device_label",
            field=models.CharField(blank=True, default="", max_length=80),
        ),
        migrations.AddField(
            model_name="usersession",
            name="operating_system",
            field=models.CharField(blank=True, default="", max_length=40),
        ),
        migrations.AlterField(
            model_name="usersession",
            name="revoke_reason",
            field=models.CharField(
                blank=True,
                choices=[
                    ("logout", "Logout"), ("logout_all", "Logout all"),
                    ("refresh_reuse", "Refresh token reuse"),
                    ("user_inactive", "User inactive"), ("expired", "Expired"),
                    ("security_event", "Security event"),
                    ("password_reset", "Password reset"),
                    ("password_change", "Password change"),
                    ("user_revoked", "Revoked by user"),
                ],
                default="", max_length=32,
            ),
        ),
        migrations.AlterField(
            model_name="identitysecurityevent",
            name="event_type",
            field=models.CharField(max_length=64, db_index=True, choices=[
                ("email_challenge_issued", "Email challenge issued"),
                ("email_delivery_succeeded", "Email delivery succeeded"),
                ("email_delivery_failed", "Email delivery failed"),
                ("email_delivery_queued", "Email delivery queued"),
                ("email_delivery_retry", "Email delivery retry"),
                ("email_delivery_dead", "Email delivery dead letter"),
                ("email_verification_succeeded", "Email verification succeeded"),
                ("email_verification_failed", "Email verification failed"),
                ("email_resend_blocked", "Email resend blocked"),
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
            ]),
        ),
    ]
