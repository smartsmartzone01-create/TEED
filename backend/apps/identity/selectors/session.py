from django.utils import timezone

from ..models import User, UserSession


def get_active_user_session(
    *,
    session_id,
    user: User | None = None,
) -> UserSession | None:
    queryset = UserSession.objects.filter(
        id=session_id,
        revoked_at__isnull=True,
        expires_at__gt=timezone.now(),
    )
    if user is not None:
        queryset = queryset.filter(user=user)
    return queryset.first()
