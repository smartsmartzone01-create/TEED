from hashlib import sha256

from rest_framework.throttling import SimpleRateThrottle


class LoginIPThrottle(SimpleRateThrottle):
    """Limit login attempts from one network identity."""

    scope = "login_ip"

    def get_cache_key(self, request, view):
        return self.cache_format % {
            "scope": self.scope,
            "ident": self.get_ident(request),
        }


class LoginEmailThrottle(SimpleRateThrottle):
    """Limit login attempts for one normalized email without storing it."""

    scope = "login_email"

    def get_cache_key(self, request, view):
        email = request.data.get("email")
        if not isinstance(email, str):
            return None
        normalized = email.strip().lower()
        if not normalized:
            return None
        digest = sha256(normalized.encode("utf-8")).hexdigest()
        return self.cache_format % {"scope": self.scope, "ident": digest}


class LoginPhoneThrottle(SimpleRateThrottle):
    """Use the established per-identifier login budget for phone attempts too."""

    scope = "login_email"

    def get_cache_key(self, request, view):
        phone = request.data.get("phone_number")
        if not isinstance(phone, str):
            return None
        normalized = phone.strip()
        if not normalized:
            return None
        digest = sha256(normalized.encode("utf-8")).hexdigest()
        return self.cache_format % {"scope": self.scope, "ident": digest}
