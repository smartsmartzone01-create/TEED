from django.apps import AppConfig


class CommerceConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "apps.commerce"
    verbose_name = "Commerce operations"

    def ready(self):
        from . import signals  # noqa: F401
