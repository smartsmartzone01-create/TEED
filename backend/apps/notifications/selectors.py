from django.db.models import Q
from django.utils import timezone

from .models import UserNotification


def visible_notifications(*, user, category="", unread_only=False):
    queryset = UserNotification.objects.filter(user=user).filter(
        Q(expires_at__isnull=True) | Q(expires_at__gt=timezone.now())
    )
    if category:
        queryset = queryset.filter(category=category)
    if unread_only:
        queryset = queryset.filter(read_at__isnull=True)
    return queryset


def unread_count(*, user):
    return visible_notifications(user=user, unread_only=True).count()
