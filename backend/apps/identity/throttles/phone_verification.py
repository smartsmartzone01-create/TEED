from hashlib import sha256

from rest_framework.throttling import SimpleRateThrottle


class PhoneRegistrationIPThrottle(SimpleRateThrottle):
    scope = "email_registration_ip"

    def get_cache_key(self, request, view):
        return self.cache_format % {
            "scope": self.scope,
            "ident": self.get_ident(request),
        }


class PhoneVerificationResendIPThrottle(SimpleRateThrottle):
    scope = "email_verification_resend_ip"

    def get_cache_key(self, request, view):
        return self.cache_format % {
            "scope": self.scope,
            "ident": self.get_ident(request),
        }


class PhoneVerificationResendAccountThrottle(SimpleRateThrottle):
    scope = "email_verification_resend_account"

    def get_cache_key(self, request, view):
        phone = request.data.get("phone_number")
        if not isinstance(phone, str) or not phone.strip():
            return None
        digest = sha256(phone.strip().encode("utf-8")).hexdigest()
        return self.cache_format % {"scope": self.scope, "ident": digest}
