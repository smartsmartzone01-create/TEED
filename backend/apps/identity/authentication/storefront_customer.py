from common.exceptions.modules.identity import SessionInvalid
from drf_spectacular.extensions import OpenApiAuthenticationExtension
from django.utils import timezone
from rest_framework_simplejwt.authentication import JWTAuthentication

from ..models import StorefrontCustomerSession
from ..services.storefront_customer_session import STOREFRONT_CUSTOMER_AUDIENCE


class StorefrontCustomerJWTAuthentication(JWTAuthentication):
    """Authenticate only storefront-customer access tokens and active customer sessions."""

    def get_user(self, validated_token):
        if validated_token.get("aud") != STOREFRONT_CUSTOMER_AUDIENCE:
            raise SessionInvalid()

        session_id = validated_token.get("session_id")
        customer_id = validated_token.get("customer_id")
        business_id = validated_token.get("business_id")
        if session_id is None or customer_id is None or business_id is None:
            raise SessionInvalid()

        session = (
            StorefrontCustomerSession.objects.select_related(
                "customer",
                "customer__business",
            )
            .filter(
                id=session_id,
                customer_id=customer_id,
                customer__business_id=business_id,
                customer__is_active=True,
                revoked_at__isnull=True,
                expires_at__gt=timezone.now(),
            )
            .first()
        )
        if session is None:
            raise SessionInvalid()
        return session.customer


class StorefrontCustomerJWTAuthenticationScheme(OpenApiAuthenticationExtension):
    target_class = StorefrontCustomerJWTAuthentication
    name = "storefrontCustomerBearerAuth"

    def get_security_definition(self, auto_schema):
        return {
            "type": "http",
            "scheme": "bearer",
            "bearerFormat": "JWT",
        }
