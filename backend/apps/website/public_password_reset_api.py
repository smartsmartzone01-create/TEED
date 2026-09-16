from hashlib import sha256

from common.exceptions.modules.identity import PasswordResetGrantInvalid
from common.responses import SuccessResponse
from django.utils import timezone
from rest_framework.permissions import AllowAny
from rest_framework.views import APIView

from apps.identity.models import StorefrontCustomerPasswordResetGrant
from apps.identity.serializers.storefront_customer_password_reset import (
    StorefrontPasswordResetConfirmSerializer,
    StorefrontPasswordResetRequestSerializer,
    StorefrontPasswordResetVerifySerializer,
)
from apps.identity.services import (
    confirm_storefront_customer_password_reset,
    request_storefront_customer_password_reset,
    verify_storefront_customer_password_reset_code,
)
from apps.identity.throttles.storefront_customer import StorefrontLoginIPThrottle

from .public_api import public_site


def _no_store(response):
    response["Cache-Control"] = "no-store"
    response["Pragma"] = "no-cache"
    return response


def _assert_reset_grant_matches_business(*, raw_grant, business_id):
    token_digest = sha256(raw_grant.encode("utf-8")).hexdigest()
    grant = (
        StorefrontCustomerPasswordResetGrant.objects.select_related("customer")
        .filter(token_digest=token_digest)
        .first()
    )
    if grant is None or grant.customer.business_id != business_id:
        raise PasswordResetGrantInvalid()


class PublicStorefrontPasswordResetRequestAPIView(APIView):
    authentication_classes = []
    permission_classes = [AllowAny]
    throttle_classes = [StorefrontLoginIPThrottle]
    serializer_class = StorefrontPasswordResetRequestSerializer

    def post(self, request, site_key):
        site = public_site(site_key)
        serializer = self.serializer_class(data=request.data)
        serializer.is_valid(raise_exception=True)
        request_storefront_customer_password_reset(
            business=site.business,
            identifier=serializer.validated_data["identifier"],
        )
        return _no_store(
            SuccessResponse(
                message=(
                    "If the customer account is eligible, a password reset code "
                    "has been sent."
                ),
                data={"next_step": "verify_reset_code"},
            )
        )


class PublicStorefrontPasswordResetVerifyAPIView(APIView):
    authentication_classes = []
    permission_classes = [AllowAny]
    throttle_classes = [StorefrontLoginIPThrottle]
    serializer_class = StorefrontPasswordResetVerifySerializer

    def post(self, request, site_key):
        site = public_site(site_key)
        serializer = self.serializer_class(data=request.data)
        serializer.is_valid(raise_exception=True)
        raw_grant, expires_at = verify_storefront_customer_password_reset_code(
            business=site.business,
            identifier=serializer.validated_data["identifier"],
            code=serializer.validated_data["code"],
        )
        return _no_store(
            SuccessResponse(
                message="Password reset code verified.",
                data={
                    "next_step": "choose_new_password",
                    "reset_grant": raw_grant,
                    "reset_grant_expires_in": max(
                        0,
                        int((expires_at - timezone.now()).total_seconds()),
                    ),
                },
            )
        )


class PublicStorefrontPasswordResetConfirmAPIView(APIView):
    authentication_classes = []
    permission_classes = [AllowAny]
    throttle_classes = [StorefrontLoginIPThrottle]
    serializer_class = StorefrontPasswordResetConfirmSerializer

    def post(self, request, site_key):
        site = public_site(site_key)
        serializer = self.serializer_class(data=request.data)
        serializer.is_valid(raise_exception=True)
        raw_grant = serializer.validated_data["reset_grant"]
        _assert_reset_grant_matches_business(
            raw_grant=raw_grant,
            business_id=site.business_id,
        )
        confirm_storefront_customer_password_reset(
            raw_grant=raw_grant,
            new_password=serializer.validated_data["new_password"],
        )
        return _no_store(
            SuccessResponse(
                message="Password changed successfully. Sign in again.",
                data={"next_step": "sign_in"},
            )
        )
