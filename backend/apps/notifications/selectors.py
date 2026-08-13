from django.db.models import Q
from django.utils import timezone

from .models import UserNotification


def visible_notifications(
    *, user, category="", unread_only=False, scope="", business_id=None, surface=""
):
    queryset = UserNotification.objects.filter(user=user).filter(
        Q(expires_at__isnull=True) | Q(expires_at__gt=timezone.now())
    )
    if category:
        queryset = queryset.filter(category=category)
    if scope:
        queryset = queryset.filter(scope=scope)
    if surface == "dashboard":
        queryset = queryset.exclude(
            scope__in=[
                UserNotification.Scope.WORKSPACE,
                UserNotification.Scope.CROSS_BUSINESS,
            ]
        )
    if business_id:
        queryset = queryset.filter(business_id=business_id)
    if unread_only:
        queryset = queryset.filter(read_at__isnull=True)
    return queryset


def unread_count(*, user, scope="", business_id=None, surface=""):
    return visible_notifications(
        user=user,
        unread_only=True,
        scope=scope,
        business_id=business_id,
        surface=surface,
    ).count()
