from django.utils import timezone

from apps.identity.models import IdentitySecurityEvent, UserSession


def active_sessions(user):
    return UserSession.objects.filter(
        user=user, revoked_at__isnull=True, expires_at__gt=timezone.now()
    ).order_by("-last_seen_at")


def security_events(user, limit=30):
    return IdentitySecurityEvent.objects.filter(user=user).order_by("-created_at")[
        :limit
    ]


def session_data(session, current_session_id):
    return {
        "id": str(session.id),
        "current": str(session.id) == str(current_session_id),
        "device_label": session.device_label or "Unknown device",
        "browser": session.browser or "Unknown browser",
        "operating_system": session.operating_system,
        "ip_address": str(session.ip_address or ""),
        "created_at": session.created_at,
        "last_seen_at": session.last_seen_at,
        "expires_at": session.expires_at,
    }


def event_data(event, current_session_id):
    return {
        "id": str(event.id),
        "event_type": event.event_type,
        "outcome": event.outcome,
        "occurred_at": event.created_at,
        "ip_address": str(event.ip_address or ""),
        "current_session": bool(
            event.session_id and str(event.session_id) == str(current_session_id)
        ),
    }
