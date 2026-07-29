from hashlib import sha256

from rest_framework.throttling import SimpleRateThrottle


class PasswordResetRequestIPThrottle(SimpleRateThrottle):
    scope = "password_reset_request_ip"

    def get_cache_key(self, request, view):
        return self.cache_format % {
            "scope": self.scope,
            "ident": self.get_ident(request),
        }


class PasswordResetVerifyIPThrottle(SimpleRateThrottle):
    scope = "password_reset_verify_ip"

    def get_cache_key(self, request, view):
        return self.cache_format % {
            "scope": self.scope,
            "ident": self.get_ident(request),
        }


class PasswordResetConfirmIPThrottle(SimpleRateThrottle):
    scope = "password_reset_confirm_ip"

    def get_cache_key(self, request, view):
        return self.cache_format % {
            "scope": self.scope,
            "ident": self.get_ident(request),
        }


class PasswordResetRequestAccountThrottle(SimpleRateThrottle):
    scope = "password_reset_request_account"

    def get_cache_key(self, request, view):
        email = request.data.get("email")
        if not isinstance(email, str) or not email.strip():
            return None
        digest = sha256(email.strip().lower().encode("utf-8")).hexdigest()
        return self.cache_format % {
            "scope": self.scope,
            "ident": digest,
        }


class PasswordResetVerifyAccountThrottle(SimpleRateThrottle):
    scope = "password_reset_verify_account"

    def get_cache_key(self, request, view):
        email = request.data.get("email")
        if not isinstance(email, str) or not email.strip():
            return None
        digest = sha256(email.strip().lower().encode("utf-8")).hexdigest()
        return self.cache_format % {
            "scope": self.scope,
            "ident": digest,
        }
