from .base import *

DEBUG = True


def development_frontend_origins():
    origins = [
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ]
    for host in ALLOWED_HOSTS:
        normalized_host = host.strip()
        if not normalized_host or normalized_host in {"*", "localhost", "127.0.0.1"}:
            continue
        origins.append(f"http://{normalized_host}:3000")
    return list(dict.fromkeys(origins))


CORS_ALLOWED_ORIGINS = development_frontend_origins()
CORS_ALLOW_CREDENTIALS = True

CSRF_TRUSTED_ORIGINS = development_frontend_origins()

EMAIL_BACKEND = "django.core.mail.backends.console.EmailBackend"
EMAIL_DELIVERY_AUTOPROCESS = True
