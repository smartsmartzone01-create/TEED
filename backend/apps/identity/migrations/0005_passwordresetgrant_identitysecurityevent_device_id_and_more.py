import apps.identity.models.security_event
import common.database.uuid
import django.db.models.deletion
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('identity', '0004_identitysecurityevent'),
    ]

    operations = [
        migrations.CreateModel(
            name='PasswordResetGrant',
            fields=[
                ('id', models.UUIDField(default=common.database.uuid.generate_uuid, editable=False, primary_key=True, serialize=False)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('is_deleted', models.BooleanField(db_index=True, default=False)),
                ('deleted_at', models.DateTimeField(blank=True, null=True)),
                ('challenge_id', models.UUIDField(db_index=True)),
                ('token_digest', models.CharField(max_length=64, unique=True)),
                ('expires_at', models.DateTimeField(db_index=True)),
                ('consumed_at', models.DateTimeField(blank=True, db_index=True, null=True)),
                ('device_id', models.UUIDField(blank=True, null=True)),
            ],
            options={
                'db_table': 'identity_password_reset_grants',
                'ordering': ['-created_at'],
            },
        ),
        migrations.AddField(
            model_name='identitysecurityevent',
            name='device_id',
            field=models.UUIDField(blank=True, db_index=True, null=True),
        ),
        migrations.AddField(
            model_name='identitysecurityevent',
            name='expires_at',
            field=models.DateTimeField(db_index=True, default=apps.identity.models.security_event.default_security_event_expiry),
        ),
        migrations.AddField(
            model_name='identitysecurityevent',
            name='identifier_hash',
            field=models.CharField(blank=True, default='', max_length=64),
        ),
        migrations.AddField(
            model_name='identitysecurityevent',
            name='session_id',
            field=models.UUIDField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name='usersession',
            name='device_id',
            field=models.UUIDField(blank=True, db_index=True, null=True),
        ),
        migrations.AlterField(
            model_name='emailverificationchallenge',
            name='purpose',
            field=models.CharField(choices=[('registration', 'Registration'), ('password_reset', 'Password reset')], default='registration', max_length=32),
        ),
        migrations.AlterField(
            model_name='identitysecurityevent',
            name='event_type',
            field=models.CharField(choices=[('email_challenge_issued', 'Email challenge issued'), ('email_delivery_succeeded', 'Email delivery succeeded'), ('email_delivery_failed', 'Email delivery failed'), ('email_verification_succeeded', 'Email verification succeeded'), ('email_verification_failed', 'Email verification failed'), ('email_resend_blocked', 'Email resend blocked'), ('login_succeeded', 'Login succeeded'), ('login_failed', 'Login failed'), ('registration_succeeded', 'Registration succeeded'), ('registration_failed', 'Registration failed'), ('password_reset_requested', 'Password reset requested'), ('password_reset_request_blocked', 'Password reset request blocked'), ('password_reset_code_succeeded', 'Password reset code succeeded'), ('password_reset_code_failed', 'Password reset code failed'), ('password_reset_succeeded', 'Password reset succeeded'), ('password_reset_failed', 'Password reset failed')], db_index=True, max_length=64),
        ),
        migrations.AlterField(
            model_name='identitysecurityevent',
            name='user',
            field=models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='security_events', to=settings.AUTH_USER_MODEL),
        ),
        migrations.AlterField(
            model_name='usersession',
            name='revoke_reason',
            field=models.CharField(blank=True, choices=[('logout', 'Logout'), ('logout_all', 'Logout all'), ('refresh_reuse', 'Refresh token reuse'), ('user_inactive', 'User inactive'), ('expired', 'Expired'), ('security_event', 'Security event'), ('password_reset', 'Password reset')], default='', max_length=32),
        ),
        migrations.AddIndex(
            model_name='identitysecurityevent',
            index=models.Index(fields=['identifier_hash', 'event_type', 'created_at'], name='identity_event_identifier_idx'),
        ),
        migrations.AddField(
            model_name='passwordresetgrant',
            name='user',
            field=models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='password_reset_grants', to=settings.AUTH_USER_MODEL),
        ),
        migrations.AddIndex(
            model_name='passwordresetgrant',
            index=models.Index(fields=['user', 'consumed_at', 'expires_at'], name='identity_reset_grant_idx'),
        ),
    ]
