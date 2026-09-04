from django.conf import settings

from ..exceptions import IntelligenceConfigurationError
from .groq import GroqProvider


def get_provider(name=None):
    provider_name = (name or settings.AI_PROVIDER).strip().lower()
    if provider_name == "groq":
        return GroqProvider.from_settings()
    raise IntelligenceConfigurationError(
        f"Unsupported AI provider: {provider_name or '<empty>'}"
    )


__all__ = ["get_provider"]
