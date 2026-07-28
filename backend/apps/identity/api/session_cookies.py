from ipaddress import ip_address

from django.conf import settings
from django.utils import timezone


def get_request_session_metadata(request) -> dict:
    raw_ip = request.META.get("REMOTE_ADDR")
    try:
        normalized_ip = str(ip_address(raw_ip)) if raw_ip else None
    except ValueError:
        normalized_ip = None

    return {
        "ip_address": normalized_ip,
        "user_agent": request.META.get("HTTP_USER_AGENT", ""),
    }


def get_refresh_cookie(request) -> str:
    return request.COOKIES.get(
        settings.REFRESH_TOKEN_COOKIE_NAME,
        "",
    )


def set_refresh_cookie(
    response,
    *,
    refresh_token: str,
    expires_at,
) -> None:
    max_age = max(
        0,
        int((expires_at - timezone.now()).total_seconds()),
    )
    response.set_cookie(
        key=settings.REFRESH_TOKEN_COOKIE_NAME,
        value=refresh_token,
        max_age=max_age,
        path=settings.REFRESH_TOKEN_COOKIE_PATH,
        secure=settings.REFRESH_TOKEN_COOKIE_SECURE,
        httponly=True,
        samesite=settings.REFRESH_TOKEN_COOKIE_SAMESITE,
    )


def clear_refresh_cookie(response) -> None:
    response.delete_cookie(
        key=settings.REFRESH_TOKEN_COOKIE_NAME,
        path=settings.REFRESH_TOKEN_COOKIE_PATH,
        samesite=settings.REFRESH_TOKEN_COOKIE_SAMESITE,
    )


def access_token_response(tokens: dict) -> dict:
    remaining_seconds = max(
        0,
        int((tokens["access_expires_at"] - timezone.now()).total_seconds()),
    )
    return {
        "access": tokens["access"],
        "token_type": tokens["token_type"],
        "expires_in": remaining_seconds,
    }
