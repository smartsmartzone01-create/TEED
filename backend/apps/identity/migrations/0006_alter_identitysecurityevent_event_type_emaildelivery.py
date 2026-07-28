import common.database.uuid
import django.db.models.deletion
import django.utils.timezone
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('identity', '0005_passwordresetgrant_identitysecurityevent_device_id_and_more'),
    ]

    operations = [
        migrations.AlterField(
            model_name='identitysecurityevent',
            name='event_type',
            field=models.CharField(choices=[('email_challenge_issued', 'Email challenge issued'), ('email_delivery_succeeded', 'Email delivery succeeded'), ('email_delivery_failed', 'Email delivery failed'), ('email_delivery_queued', 'Email delivery queued'), ('email_delivery_retry', 'Email delivery retry'), ('email_delivery_dead', 'Email delivery dead letter'), ('email_verification_succeeded', 'Email verification succeeded'), ('email_verification_failed', 'Email verification failed'), ('email_resend_blocked', 'Email resend blocked'), ('login_succeeded', 'Login succeeded'), ('login_failed', 'Login failed'), ('registration_succeeded', 'Registration succeeded'), ('registration_failed', 'Registration failed'), ('password_reset_requested', 'Password reset requested'), ('password_reset_request_blocked', 'Password reset request blocked'), ('password_reset_code_succeeded', 'Password reset code succeeded'), ('password_reset_code_failed', 'Password reset code failed'), ('password_reset_succeeded', 'Password reset succeeded'), ('password_reset_failed', 'Password reset failed')], db_index=True, max_length=64),
        ),
        migrations.CreateModel(
            name='EmailDelivery',
            fields=[
                ('id', models.UUIDField(default=common.database.uuid.generate_uuid, editable=False, primary_key=True, serialize=False)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('is_deleted', models.BooleanField(db_index=True, default=False)),
                ('deleted_at', models.DateTimeField(blank=True, null=True)),
                ('template', models.CharField(choices=[('email_verification', 'Email verification'), ('password_reset', 'Password reset'), ('password_changed', 'Password changed')], max_length=32)),
                ('status', models.CharField(choices=[('pending', 'Pending'), ('processing', 'Processing'), ('retry', 'Retry'), ('sent', 'Sent'), ('dead', 'Dead letter')], db_index=True, default='pending', max_length=16)),
                ('idempotency_key', models.CharField(max_length=128, unique=True)),
                ('recipient_hash', models.CharField(max_length=64)),
                ('encrypted_payload', models.TextField()),
                ('challenge_id', models.UUIDField(blank=True, db_index=True, null=True)),
                ('attempt_count', models.PositiveSmallIntegerField(default=0)),
                ('max_attempts', models.PositiveSmallIntegerField(default=5)),
                ('next_attempt_at', models.DateTimeField(db_index=True, default=django.utils.timezone.now)),
                ('locked_at', models.DateTimeField(blank=True, null=True)),
                ('sent_at', models.DateTimeField(blank=True, null=True)),
                ('expires_at', models.DateTimeField(db_index=True)),
                ('provider_message_id', models.CharField(blank=True, default='', max_length=255)),
                ('last_error_code', models.CharField(blank=True, default='', max_length=64)),
                ('user', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='email_deliveries', to=settings.AUTH_USER_MODEL)),
            ],
            options={
                'db_table': 'identity_email_deliveries',
                'ordering': ['-created_at'],
                'indexes': [models.Index(fields=['status', 'next_attempt_at'], name='identity_email_due_idx')],
            },
        ),
    ]
