from cryptography.fernet import Fernet
from django.conf import settings
from django.core.checks import Error, register
from django.utils.module_loading import import_string


@register()
def email_delivery_configuration_check(app_configs, **kwargs):
    errors = []
    if (
        settings.EMAIL_DELIVERY_REQUIRE_EXPLICIT_KEY
        and not settings.EMAIL_DELIVERY_ENCRYPTION_KEY
    ):
        errors.append(
            Error(
                "EMAIL_DELIVERY_ENCRYPTION_KEY is required in production.",
                id="identity.E001",
            )
        )
    if settings.EMAIL_DELIVERY_ENCRYPTION_KEY:
        try:
            Fernet(settings.EMAIL_DELIVERY_ENCRYPTION_KEY.encode("ascii"))
        except (ValueError, TypeError):
            errors.append(
                Error(
                    "EMAIL_DELIVERY_ENCRYPTION_KEY is not a valid Fernet key.",
                    id="identity.E002",
                )
            )
    try:
        provider = import_string(settings.EMAIL_DELIVERY_PROVIDER)()
    except (ImportError, AttributeError, TypeError):
        errors.append(
            Error(
                "EMAIL_DELIVERY_PROVIDER cannot be constructed.",
                id="identity.E003",
            )
        )
    else:
        if not callable(getattr(provider, "send", None)):
            errors.append(
                Error(
                    "EMAIL_DELIVERY_PROVIDER must implement send().",
                    id="identity.E004",
                )
            )
    return errors
