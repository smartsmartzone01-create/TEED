from common.responses import SuccessResponse
from django.utils.decorators import method_decorator
from django.views.decorators.csrf import csrf_protect
from rest_framework.permissions import AllowAny
from rest_framework.views import APIView

from ..serializers import (
    EmailLoginSerializer,
    GoogleAuthenticationSerializer,
    PhoneLoginSerializer,
)
from ..services import (
    authenticate_google_user,
    login_email_user,
    login_phone_user,
)
from ..throttles import LoginEmailThrottle, LoginIPThrottle, LoginPhoneThrottle
from .session_cookies import (
    access_token_response,
    get_request_session_metadata,
    set_device_cookie,
    set_refresh_cookie,
)


def _login_response(*, request, result):
    user = result["user"]
    response = SuccessResponse(
        message="Signed in successfully.",
        data={
            "user_id": str(user.id),
            "email": user.email,
            "phone_number": user.phone_number,
            "country_code": user.country_code,
            "is_phone_verified": user.is_phone_verified,
            "username": user.username,
            "suggested_username": result.get("suggested_username"),
            "is_onboarding_complete": user.is_onboarding_complete,
            "next_step": result["next_step"],
            "tokens": access_token_response(result["tokens"]),
        },
    )
    set_refresh_cookie(
        response,
        refresh_token=result["tokens"]["refresh"],
        expires_at=result["tokens"]["refresh_expires_at"],
    )
    set_device_cookie(response, request)
    return response


@method_decorator(csrf_protect, name="dispatch")
class EmailLoginAPIView(APIView):
    serializer_class = EmailLoginSerializer
    permission_classes = [AllowAny]
    authentication_classes = []
    throttle_classes = [LoginIPThrottle, LoginEmailThrottle]

    def post(self, request):
        serializer = self.serializer_class(data=request.data)
        serializer.is_valid(raise_exception=True)
        result = login_email_user(
            **serializer.validated_data,
            **get_request_session_metadata(request),
        )
        return _login_response(request=request, result=result)


@method_decorator(csrf_protect, name="dispatch")
class PhoneLoginAPIView(APIView):
    serializer_class = PhoneLoginSerializer
    permission_classes = [AllowAny]
    authentication_classes = []
    throttle_classes = [LoginIPThrottle, LoginPhoneThrottle]

    def post(self, request):
        serializer = self.serializer_class(data=request.data)
        serializer.is_valid(raise_exception=True)
        validated = dict(serializer.validated_data)
        validated.pop("country_code", None)
        result = login_phone_user(
            **validated,
            **get_request_session_metadata(request),
        )
        return _login_response(request=request, result=result)


@method_decorator(csrf_protect, name="dispatch")
class GoogleAuthenticationAPIView(APIView):
    serializer_class = GoogleAuthenticationSerializer
    permission_classes = [AllowAny]
    authentication_classes = []
    throttle_classes = [LoginIPThrottle]

    def post(self, request):
        serializer = self.serializer_class(data=request.data)
        serializer.is_valid(raise_exception=True)
        result = authenticate_google_user(
            **serializer.validated_data,
            **get_request_session_metadata(request),
        )
        return _login_response(request=request, result=result)
