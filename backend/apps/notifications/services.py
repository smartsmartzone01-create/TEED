from urllib.parse import urlsplit

from django.db import transaction
from django.utils import timezone

from .models import UserNotification
from .repositories import create_notification, mark_notification_read
from .selectors import visible_notifications


def _safe_action_path(path):
    if not path:
        return ""
    parsed = urlsplit(path)
    if parsed.scheme or parsed.netloc or not parsed.path.startswith("/dashboard"):
        raise ValueError("Notification action paths must stay inside the dashboard.")
    return parsed.path


def notify_user(
    *,
    user,
    category,
    template,
    context=None,
    action_path="",
    deduplication_key="",
    expires_at=None,
):
    safe_context = {
        key: value
        for key, value in (context or {}).items()
        if key in {"count", "workspace_name", "role"} and isinstance(value, (str, int))
    }
    return create_notification(
        user=user,
        category=category,
        template=template,
        context=safe_context,
        action_path=_safe_action_path(action_path),
        deduplication_key=deduplication_key,
        expires_at=expires_at,
    )


@transaction.atomic
def read_notification(*, user, notification_id):
    notification = (
        UserNotification.objects.select_for_update()
        .filter(user=user, id=notification_id)
        .first()
    )
    if notification is None:
        return None
    return mark_notification_read(notification=notification)


def read_all_notifications(*, user):
    return visible_notifications(user=user, unread_only=True).update(
        read_at=timezone.now(), updated_at=timezone.now()
    )
