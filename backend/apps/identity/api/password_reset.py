from common.responses import SuccessResponse
from django.conf import settings
from django.utils import timezone
from django.utils.decorators import method_decorator
from django.views.decorators.csrf import csrf_protect
from rest_framework.permissions import AllowAny
from rest_framework.views import APIView

from ..serializers import (
    PasswordResetConfirmSerializer,
    PasswordResetRequestSerializer,
    PasswordResetVerifySerializer,
)
from ..services import (
    confirm_password_reset,
    request_password_reset,
    verify_password_reset_code,
)
from ..throttles import (
    PasswordResetConfirmIPThrottle,
    PasswordResetRequestAccountThrottle,
    PasswordResetRequestIPThrottle,
    PasswordResetVerifyAccountThrottle,
    PasswordResetVerifyIPThrottle,
)
from .session_cookies import get_request_session_metadata, set_device_cookie


def _set_reset_cookie(response, *, raw_grant, expires_at):
    response.set_cookie(
        key=settings.PASSWORD_RESET_COOKIE_NAME,
        value=raw_grant,
        max_age=max(0, int((expires_at - timezone.now()).total_seconds())),
        path=settings.PASSWORD_RESET_COOKIE_PATH,
        secure=settings.PASSWORD_RESET_COOKIE_SECURE,
        httponly=True,
        samesite=settings.PASSWORD_RESET_COOKIE_SAMESITE,
    )


def _clear_reset_cookie(response):
    response.delete_cookie(
        key=settings.PASSWORD_RESET_COOKIE_NAME,
        path=settings.PASSWORD_RESET_COOKIE_PATH,
        samesite=settings.PASSWORD_RESET_COOKIE_SAMESITE,
    )


class PasswordResetRequestAPIView(APIView):
    serializer_class = PasswordResetRequestSerializer
    permission_classes = [AllowAny]
    authentication_classes = []
    throttle_classes = [
        PasswordResetRequestIPThrottle,
        PasswordResetRequestAccountThrottle,
    ]

    def post(self, request):
        serializer = self.serializer_class(data=request.data)
        serializer.is_valid(raise_exception=True)
        metadata = get_request_session_metadata(request)
        request_password_reset(
            email=serializer.validated_data["email"],
            **metadata,
        )
        response = SuccessResponse(
            message=(
                "If the account is eligible, a password reset code has been sent."
            ),
            data={"next_step": "verify_reset_code"},
        )
        set_device_cookie(response, request)
        return response


@method_decorator(csrf_protect, name="dispatch")
class PasswordResetVerifyAPIView(APIView):
    serializer_class = PasswordResetVerifySerializer
    permission_classes = [AllowAny]
    authentication_classes = []
    throttle_classes = [
        PasswordResetVerifyIPThrottle,
        PasswordResetVerifyAccountThrottle,
    ]

    def post(self, request):
        serializer = self.serializer_class(data=request.data)
        serializer.is_valid(raise_exception=True)
        metadata = get_request_session_metadata(request)
        raw_grant, expires_at = verify_password_reset_code(
            **serializer.validated_data,
            **metadata,
        )
        response = SuccessResponse(
            message="Password reset code verified.",
            data={"next_step": "choose_new_password"},
        )
        _set_reset_cookie(
            response,
            raw_grant=raw_grant,
            expires_at=expires_at,
        )
        set_device_cookie(response, request)
        return response


@method_decorator(csrf_protect, name="dispatch")
class PasswordResetConfirmAPIView(APIView):
    serializer_class = PasswordResetConfirmSerializer
    permission_classes = [AllowAny]
    authentication_classes = []
    throttle_classes = [PasswordResetConfirmIPThrottle]

    def post(self, request):
        serializer = self.serializer_class(data=request.data)
        serializer.is_valid(raise_exception=True)
        metadata = get_request_session_metadata(request)
        confirm_password_reset(
            raw_grant=request.COOKIES.get(
                settings.PASSWORD_RESET_COOKIE_NAME,
                "",
            ),
            new_password=serializer.validated_data["new_password"],
            **metadata,
        )
        response = SuccessResponse(
            message="Password changed successfully. Sign in again.",
            data={"next_step": "sign_in"},
        )
        _clear_reset_cookie(response)
        set_device_cookie(response, request)
        return response
