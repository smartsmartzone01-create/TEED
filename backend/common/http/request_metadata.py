from ipaddress import ip_address
from uuid import UUID, uuid4

from django.conf import settings


def get_request_metadata(request):
    raw_ip = request.META.get("REMOTE_ADDR")
    try:
        normalized_ip = str(ip_address(raw_ip)) if raw_ip else None
    except ValueError:
        normalized_ip = None

    raw_device_id = request.COOKIES.get(settings.DEVICE_COOKIE_NAME, "")
    try:
        device_id = UUID(raw_device_id)
    except (ValueError, TypeError, AttributeError):
        device_id = uuid4()
    request.teed_device_id = device_id

    return {
        "ip_address": normalized_ip,
        "user_agent": request.META.get("HTTP_USER_AGENT", ""),
        "device_id": device_id,
    }
