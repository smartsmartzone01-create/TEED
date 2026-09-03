from common.responses import SuccessResponse
from rest_framework import status
from rest_framework.permissions import AllowAny
from rest_framework.views import APIView

from ..serializers import EmailRegistrationSerializer, PhoneRegistrationSerializer
from ..services import register_email_user, register_phone_user
from ..throttles import EmailRegistrationIPThrottle, PhoneRegistrationIPThrottle
from .session_cookies import get_request_session_metadata, set_device_cookie


class EmailRegistrationAPIView(APIView):
    serializer_class = EmailRegistrationSerializer
    permission_classes = [AllowAny]
    authentication_classes = []
    throttle_classes = [EmailRegistrationIPThrottle]

    def post(self, request):
        serializer = self.serializer_class(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = register_email_user(
            **serializer.validated_data,
            **get_request_session_metadata(request),
        )
        response = SuccessResponse(
            message="Registration successful. Verify your email to continue.",
            data={
                "user_id": str(user.id),
                "email": user.email,
                "next_step": "verify_email",
            },
            status_code=status.HTTP_201_CREATED,
        )
        set_device_cookie(response, request)
        return response


class PhoneRegistrationAPIView(APIView):
    serializer_class = PhoneRegistrationSerializer
    permission_classes = [AllowAny]
    authentication_classes = []
    throttle_classes = [PhoneRegistrationIPThrottle]

    def post(self, request):
        serializer = self.serializer_class(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = register_phone_user(
            **serializer.validated_data,
            **get_request_session_metadata(request),
        )
        response = SuccessResponse(
            message="Registration successful. Verify your phone to continue.",
            data={
                "user_id": str(user.id),
                "phone_number": user.phone_number,
                "country_code": user.country_code,
                "next_step": "verify_phone",
            },
            status_code=status.HTTP_201_CREATED,
        )
        set_device_cookie(response, request)
        return response
