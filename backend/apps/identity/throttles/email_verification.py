from hashlib import sha256

from rest_framework.throttling import SimpleRateThrottle


class EmailRegistrationIPThrottle(SimpleRateThrottle):
    scope = "email_registration_ip"

    def get_cache_key(self, request, view):
        return self.cache_format % {
            "scope": self.scope,
            "ident": self.get_ident(request),
        }


class EmailVerificationResendIPThrottle(SimpleRateThrottle):
    scope = "email_verification_resend_ip"

    def get_cache_key(self, request, view):
        return self.cache_format % {
            "scope": self.scope,
            "ident": self.get_ident(request),
        }


class EmailVerificationResendAccountThrottle(SimpleRateThrottle):
    scope = "email_verification_resend_account"

    def get_cache_key(self, request, view):
        email = request.data.get("email")
        if not isinstance(email, str):
            return None
        normalized_email = email.strip().lower()
        if not normalized_email:
            return None
        digest = sha256(normalized_email.encode("utf-8")).hexdigest()
        return self.cache_format % {
            "scope": self.scope,
            "ident": digest,
        }
