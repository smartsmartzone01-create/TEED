from django.utils import timezone

from .models import UserNotification


def create_notification(**values):
    key = values.get("deduplication_key", "")
    if key:
        notification, _ = UserNotification.objects.get_or_create(
            user=values["user"], deduplication_key=key, defaults=values
        )
        return notification
    return UserNotification.objects.create(**values)


def mark_notification_read(*, notification):
    if notification.read_at is None:
        notification.read_at = timezone.now()
        notification.save(update_fields=["read_at", "updated_at"])
    return notification
