from .authentication import LoginEmailThrottle, LoginIPThrottle, LoginPhoneThrottle
from .email_verification import EmailRegistrationIPThrottle


def _site_scoped_cache_key(base_key, view):
    if base_key is None:
        return None
    site_key = view.kwargs.get("site_key")
    return f"{base_key}:storefront:{site_key}"


class StorefrontRegistrationIPThrottle(EmailRegistrationIPThrottle):
    """Reuse registration policy without sharing counters with workspace auth."""

    def get_cache_key(self, request, view):
        return _site_scoped_cache_key(
            super().get_cache_key(request, view),
            view,
        )


class StorefrontLoginIPThrottle(LoginIPThrottle):
    """Reuse login IP policy with a storefront/site-specific cache identity."""

    def get_cache_key(self, request, view):
        return _site_scoped_cache_key(
            super().get_cache_key(request, view),
            view,
        )


class StorefrontLoginEmailThrottle(LoginEmailThrottle):
    """Keep storefront email login budgets separate per merchant site."""

    def get_cache_key(self, request, view):
        return _site_scoped_cache_key(
            super().get_cache_key(request, view),
            view,
        )


class StorefrontLoginPhoneThrottle(LoginPhoneThrottle):
    """Keep storefront phone login budgets separate per merchant site."""

    def get_cache_key(self, request, view):
        return _site_scoped_cache_key(
            super().get_cache_key(request, view),
            view,
        )
