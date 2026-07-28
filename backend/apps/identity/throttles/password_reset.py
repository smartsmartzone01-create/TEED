from hashlib import sha256

from rest_framework.throttling import SimpleRateThrottle


class PasswordResetIPThrottle(SimpleRateThrottle):
    scope = "password_reset_ip"

    def get_cache_key(self, request, view):
        return self.cache_format % {
            "scope": self.scope,
            "ident": self.get_ident(request),
        }


class PasswordResetAccountThrottle(SimpleRateThrottle):
    scope = "password_reset_account"

    def get_cache_key(self, request, view):
        email = request.data.get("email")
        if not isinstance(email, str) or not email.strip():
            return None
        digest = sha256(email.strip().lower().encode("utf-8")).hexdigest()
        return self.cache_format % {
            "scope": self.scope,
            "ident": digest,
        }
