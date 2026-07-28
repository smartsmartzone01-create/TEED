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

        normalized_email = email.strip().lower()
        if not normalized_email:
            return None

        email_digest = sha256(normalized_email.encode("utf-8")).hexdigest()
        return self.cache_format % {
            "scope": self.scope,
            "ident": email_digest,
        }
