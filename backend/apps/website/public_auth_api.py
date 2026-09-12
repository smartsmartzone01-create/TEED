from common.exceptions.modules.identity import (
    EmailVerificationChallengeNotFound,
    PhoneVerificationChallengeNotFound,
    RefreshTokenInvalid,
    SessionInvalid,
)
from common.http import get_request_metadata
from common.responses import SuccessResponse
from django.utils import timezone
from rest_framework import status
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.throttling import ScopedRateThrottle
from rest_framework.views import APIView

from apps.identity.authentication import StorefrontCustomerJWTAuthentication
from apps.identity.models import StorefrontCustomer, StorefrontCustomerVerificationChallenge
from apps.identity.serializers.storefront_customer import (
    StorefrontEmailLoginSerializer,
    StorefrontEmailRegistrationSerializer,
    StorefrontEmailVerificationSerializer,
    StorefrontPhoneLoginSerializer,
    StorefrontPhoneRegistrationSerializer,
    StorefrontPhoneVerificationSerializer,
    StorefrontRefreshCredentialSerializer,
)
from apps.identity.services import (
    decode_storefront_customer_refresh_token,
    issue_storefront_customer_token_pair,
    login_storefront_customer_with_email,
    login_storefront_customer_with_phone,
    register_storefront_customer_with_email,
    register_storefront_customer_with_phone,
    revoke_storefront_customer_refresh_session,
    rotate_storefront_customer_refresh_token,
    verify_storefront_customer_verification_code,
)
from apps.identity.throttles.storefront_customer import (
    StorefrontLoginEmailThrottle,
    StorefrontLoginIPThrottle,
    StorefrontLoginPhoneThrottle,
    StorefrontRegistrationIPThrottle,
)

from .public_api import public_site


def _customer_payload(customer: StorefrontCustomer) -> dict:
    return {
        "id": str(customer.id),
        "email": customer.email,
        "phone_number": customer.phone_number,
        "first_name": customer.first_name,
        "last_name": customer.last_name,
        "is_email_verified": customer.is_email_verified,
        "is_phone_verified": customer.is_phone_verified,
    }


def _token_payload(tokens: dict) -> dict:
    return {
        "access": tokens["access"],
        "refresh": tokens["refresh"],
        "token_type": tokens["token_type"],
        "access_expires_in": max(
            0,
            int((tokens["access_expires_at"] - timezone.now()).total_seconds()),
        ),
        "refresh_expires_at": tokens["refresh_expires_at"].isoformat(),
        "session_id": tokens["session_id"],
    }


def _no_store(response):
    response["Cache-Control"] = "no-store"
    response["Pragma"] = "no-cache"
    return response


def _authenticated_response(*, message: str, customer, tokens):
    return _no_store(
        SuccessResponse(
            message=message,
            data={
                "customer": _customer_payload(customer),
                "tokens": _token_payload(tokens),
            },
        )
    )


def _email_customer(*, business, email):
    customer = StorefrontCustomer.objects.filter(
        business=business,
        email__iexact=email,
    ).first()
    if customer is None:
        raise EmailVerificationChallengeNotFound()
    return customer


def _phone_customer(*, business, phone_number):
    customer = StorefrontCustomer.objects.filter(
        business=business,
        phone_number=phone_number,
    ).first()
    if customer is None:
        raise PhoneVerificationChallengeNotFound()
    return customer


class PublicStorefrontEmailRegistrationAPIView(APIView):
    authentication_classes = []
    permission_classes = [AllowAny]
    throttle_classes = [StorefrontRegistrationIPThrottle]
    serializer_class = StorefrontEmailRegistrationSerializer

    def post(self, request, site_key):
        site = public_site(site_key)
        serializer = self.serializer_class(data=request.data)
        serializer.is_valid(raise_exception=True)
        customer = register_storefront_customer_with_email(
            business=site.business,
            **serializer.validated_data,
        )
        return _no_store(
            SuccessResponse(
                message="Storefront customer registered. Verify the email address.",
                data={
                    "customer": _customer_payload(customer),
                    "next_step": "verify_email",
                },
                status_code=status.HTTP_201_CREATED,
            )
        )


class PublicStorefrontPhoneRegistrationAPIView(APIView):
    authentication_classes = []
    permission_classes = [AllowAny]
    throttle_classes = [StorefrontRegistrationIPThrottle]
    serializer_class = StorefrontPhoneRegistrationSerializer

    def post(self, request, site_key):
        site = public_site(site_key)
        serializer = self.serializer_class(data=request.data)
        serializer.is_valid(raise_exception=True)
        validated = dict(serializer.validated_data)
        validated.pop("country_code", None)
        customer = register_storefront_customer_with_phone(
            business=site.business,
            **validated,
        )
        return _no_store(
            SuccessResponse(
                message="Storefront customer registered. Verify the phone number.",
                data={
                    "customer": _customer_payload(customer),
                    "next_step": "verify_phone",
                },
                status_code=status.HTTP_201_CREATED,
            )
        )


class PublicStorefrontEmailVerificationAPIView(APIView):
    authentication_classes = []
    permission_classes = [AllowAny]
    throttle_classes = [StorefrontLoginIPThrottle]
    serializer_class = StorefrontEmailVerificationSerializer

    def post(self, request, site_key):
        site = public_site(site_key)
        serializer = self.serializer_class(data=request.data)
        serializer.is_valid(raise_exception=True)
        customer = _email_customer(
            business=site.business,
            email=serializer.validated_data["email"],
        )
        customer = verify_storefront_customer_verification_code(
            customer=customer,
            channel=StorefrontCustomerVerificationChallenge.Channel.EMAIL,
            code=serializer.validated_data["code"],
        )
        tokens = issue_storefront_customer_token_pair(
            customer=customer,
            **get_request_metadata(request),
        )
        return _authenticated_response(
            message="Email verified and signed in successfully.",
            customer=customer,
            tokens=tokens,
        )


class PublicStorefrontPhoneVerificationAPIView(APIView):
    authentication_classes = []
    permission_classes = [AllowAny]
    throttle_classes = [StorefrontLoginIPThrottle]
    serializer_class = StorefrontPhoneVerificationSerializer

    def post(self, request, site_key):
        site = public_site(site_key)
        serializer = self.serializer_class(data=request.data)
        serializer.is_valid(raise_exception=True)
        customer = _phone_customer(
            business=site.business,
            phone_number=serializer.validated_data["phone_number"],
        )
        customer = verify_storefront_customer_verification_code(
            customer=customer,
            channel=StorefrontCustomerVerificationChallenge.Channel.PHONE,
            code=serializer.validated_data["code"],
        )
        tokens = issue_storefront_customer_token_pair(
            customer=customer,
            **get_request_metadata(request),
        )
        return _authenticated_response(
            message="Phone number verified and signed in successfully.",
            customer=customer,
            tokens=tokens,
        )


class PublicStorefrontEmailLoginAPIView(APIView):
    authentication_classes = []
    permission_classes = [AllowAny]
    throttle_classes = [StorefrontLoginIPThrottle, StorefrontLoginEmailThrottle]
    serializer_class = StorefrontEmailLoginSerializer

    def post(self, request, site_key):
        site = public_site(site_key)
        serializer = self.serializer_class(data=request.data)
        serializer.is_valid(raise_exception=True)
        result = login_storefront_customer_with_email(
            business=site.business,
            **serializer.validated_data,
            **get_request_metadata(request),
        )
        return _authenticated_response(
            message="Signed in successfully.",
            customer=result["customer"],
            tokens=result["tokens"],
        )


class PublicStorefrontPhoneLoginAPIView(APIView):
    authentication_classes = []
    permission_classes = [AllowAny]
    throttle_classes = [StorefrontLoginIPThrottle, StorefrontLoginPhoneThrottle]
    serializer_class = StorefrontPhoneLoginSerializer

    def post(self, request, site_key):
        site = public_site(site_key)
        serializer = self.serializer_class(data=request.data)
        serializer.is_valid(raise_exception=True)
        validated = dict(serializer.validated_data)
        validated.pop("country_code", None)
        result = login_storefront_customer_with_phone(
            business=site.business,
            **validated,
            **get_request_metadata(request),
        )
        return _authenticated_response(
            message="Signed in successfully.",
            customer=result["customer"],
            tokens=result["tokens"],
        )


class PublicStorefrontSessionRefreshAPIView(APIView):
    authentication_classes = []
    permission_classes = [AllowAny]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "storefront_public"
    serializer_class = StorefrontRefreshCredentialSerializer

    def post(self, request, site_key):
        site = public_site(site_key)
        serializer = self.serializer_class(data=request.data)
        serializer.is_valid(raise_exception=True)
        raw_refresh = serializer.validated_data["refresh"]
        claims = decode_storefront_customer_refresh_token(raw_refresh)
        if claims["business_id"] != str(site.business_id):
            raise SessionInvalid()
        result = rotate_storefront_customer_refresh_token(
            raw_refresh_token=raw_refresh,
        )
        return _authenticated_response(
            message="Storefront customer session refreshed successfully.",
            customer=result["customer"],
            tokens=result,
        )


class PublicStorefrontSessionLogoutAPIView(APIView):
    authentication_classes = []
    permission_classes = [AllowAny]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "storefront_public"
    serializer_class = StorefrontRefreshCredentialSerializer

    def post(self, request, site_key):
        site = public_site(site_key)
        serializer = self.serializer_class(data=request.data)
        serializer.is_valid(raise_exception=True)
        raw_refresh = serializer.validated_data["refresh"]
        try:
            claims = decode_storefront_customer_refresh_token(raw_refresh)
        except RefreshTokenInvalid:
            claims = None
        if claims is not None and claims["business_id"] == str(site.business_id):
            revoke_storefront_customer_refresh_session(
                raw_refresh_token=raw_refresh,
            )
        return _no_store(
            SuccessResponse(
                message="Signed out successfully.",
                data=None,
            )
        )


class PublicStorefrontCurrentCustomerAPIView(APIView):
    authentication_classes = [StorefrontCustomerJWTAuthentication]
    permission_classes = [IsAuthenticated]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "storefront_public"

    def get(self, request, site_key):
        site = public_site(site_key)
        customer = request.user
        if customer.business_id != site.business_id:
            raise SessionInvalid()
        return _no_store(
            SuccessResponse(
                message="Current storefront customer retrieved successfully.",
                data={
                    "customer": _customer_payload(customer),
                    "session_id": str(request.auth["session_id"]),
                },
            )
        )
