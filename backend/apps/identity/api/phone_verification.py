from common.exceptions.modules.identity import PhoneVerificationChallengeNotFound
from common.responses import SuccessResponse
from django.utils.decorators import method_decorator
from django.views.decorators.csrf import csrf_protect
from rest_framework.permissions import AllowAny
from rest_framework.views import APIView

from ..selectors import get_user_by_phone_number
from ..serializers import (
    PhoneVerificationResendSerializer,
    PhoneVerificationSerializer,
)
from ..services import (
    issue_phone_verification_challenge,
    issue_token_pair,
    verify_phone_verification_code,
)
from ..throttles import (
    PhoneVerificationResendAccountThrottle,
    PhoneVerificationResendIPThrottle,
)
from .session_cookies import (
    access_token_response,
    get_request_session_metadata,
    set_device_cookie,
    set_refresh_cookie,
)


@method_decorator(csrf_protect, name="dispatch")
class PhoneVerificationAPIView(APIView):
    serializer_class = PhoneVerificationSerializer
    permission_classes = [AllowAny]
    authentication_classes = []

    def post(self, request):
        serializer = self.serializer_class(data=request.data)
        serializer.is_valid(raise_exception=True)
        phone_number = serializer.validated_data["phone_number"]
        user = get_user_by_phone_number(phone_number=phone_number)
        if user is None:
            raise PhoneVerificationChallengeNotFound()

        metadata = get_request_session_metadata(request)
        verify_phone_verification_code(
            user=user,
            code=serializer.validated_data["code"],
            **metadata,
        )
        user.refresh_from_db()
        tokens = issue_token_pair(user=user, **metadata)
        response = SuccessResponse(
            message="Phone verified successfully.",
            data={
                "user_id": str(user.id),
                "email": user.email,
                "phone_number": user.phone_number,
                "country_code": user.country_code,
                "is_phone_verified": True,
                "next_step": "complete_onboarding",
                "tokens": access_token_response(tokens),
            },
        )
        set_refresh_cookie(
            response,
            refresh_token=tokens["refresh"],
            expires_at=tokens["refresh_expires_at"],
        )
        set_device_cookie(response, request)
        return response


class PhoneVerificationResendAPIView(APIView):
    serializer_class = PhoneVerificationResendSerializer
    permission_classes = [AllowAny]
    authentication_classes = []
    throttle_classes = [
        PhoneVerificationResendIPThrottle,
        PhoneVerificationResendAccountThrottle,
    ]

    def post(self, request):
        serializer = self.serializer_class(data=request.data)
        serializer.is_valid(raise_exception=True)
        phone_number = serializer.validated_data["phone_number"]
        user = get_user_by_phone_number(phone_number=phone_number)
        if user is not None and not user.is_phone_verified:
            issue_phone_verification_challenge(
                user=user,
                enforce_resend_limits=True,
                **get_request_session_metadata(request),
            )
        response = SuccessResponse(
            message=(
                "If an unverified account exists for that phone number, "
                "a new verification code has been sent."
            ),
            data=None,
        )
        set_device_cookie(response, request)
        return response
