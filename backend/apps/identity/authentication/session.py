from common.exceptions.modules.identity import SessionInvalid
from drf_spectacular.extensions import OpenApiAuthenticationExtension
from rest_framework_simplejwt.authentication import JWTAuthentication

from ..selectors import get_active_user_session


class SessionJWTAuthentication(JWTAuthentication):
    """Authenticate JWTs only while their server-side session is active."""

    def get_user(self, validated_token):
        user = super().get_user(validated_token)
        session_id = validated_token.get("session_id")
        if session_id is None:
            raise SessionInvalid()

        session = get_active_user_session(
            session_id=session_id,
            user=user,
        )
        if session is None:
            raise SessionInvalid()
        return user


class SessionJWTAuthenticationScheme(OpenApiAuthenticationExtension):
    target_class = SessionJWTAuthentication
    name = "bearerAuth"

    def get_security_definition(self, auto_schema):
        return {
            "type": "http",
            "scheme": "bearer",
            "bearerFormat": "JWT",
        }
