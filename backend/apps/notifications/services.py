from urllib.parse import urlsplit

from django.db import transaction
from django.utils import timezone

from .models import UserNotification
from .repositories import create_notification, mark_notification_read
from .selectors import visible_notifications


def _safe_action_path(path, *, scope, business_id):
    if not path:
        return ""
    parsed = urlsplit(path)
    allowed_roots = ("/dashboard", "/workspace")
    inside_allowed_root = any(
        parsed.path == root or parsed.path.startswith(f"{root}/")
        for root in allowed_roots
    )
    if parsed.scheme or parsed.netloc or not inside_allowed_root:
        raise ValueError(
            "Notification action paths must stay inside an authenticated TEED area."
        )
    if scope == UserNotification.Scope.WORKSPACE:
        expected_root = f"/workspace/{business_id}"
        if not business_id or not (
            parsed.path == expected_root or parsed.path.startswith(f"{expected_root}/")
        ):
            raise ValueError(
                "Workspace notifications must target their scoped Business."
            )
    elif parsed.path.startswith("/workspace/"):
        raise ValueError(
            "Only workspace-scoped notifications may target a workspace route."
        )
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
    scope=UserNotification.Scope.PERSONAL,
    business_id=None,
):
    safe_context = {
        key: value
        for key, value in (context or {}).items()
        if key
        in {
            "action",
            "count",
            "decision",
            "workspace_name",
            "role",
            "status",
            "item_name",
            "quantity",
            "unit",
            "threshold",
            "sku",
            "customer_name",
            "agreement_reference",
            "due_date",
            "amount",
        }
        and isinstance(value, (str, int))
    }
    return create_notification(
        user=user,
        category=category,
        template=template,
        context=safe_context,
        action_path=_safe_action_path(
            action_path, scope=scope, business_id=business_id
        ),
        scope=scope,
        business_id=business_id,
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


def read_all_notifications(*, user, scope="", business_id=None, surface=""):
    return visible_notifications(
        user=user,
        unread_only=True,
        scope=scope,
        business_id=business_id,
        surface=surface,
    ).update(read_at=timezone.now(), updated_at=timezone.now())
