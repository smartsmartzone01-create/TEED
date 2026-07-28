from common.responses import SuccessResponse
from django.utils.decorators import method_decorator
from django.views.decorators.csrf import csrf_protect
from rest_framework.permissions import AllowAny
from rest_framework.views import APIView

from ..serializers import EmailLoginSerializer
from ..services import login_email_user
from ..throttles import LoginEmailThrottle, LoginIPThrottle
from .session_cookies import (
    access_token_response,
    get_request_session_metadata,
    set_device_cookie,
    set_refresh_cookie,
)


@method_decorator(csrf_protect, name="dispatch")
class EmailLoginAPIView(APIView):
    serializer_class = EmailLoginSerializer
    permission_classes = [AllowAny]
    authentication_classes = []
    throttle_classes = [
        LoginIPThrottle,
        LoginEmailThrottle,
    ]

    def post(self, request):
        serializer = EmailLoginSerializer(
            data=request.data,
        )
        serializer.is_valid(
            raise_exception=True,
        )

        result = login_email_user(
            **serializer.validated_data,
            **get_request_session_metadata(request),
        )
        user = result["user"]

        response = SuccessResponse(
            message="Signed in successfully.",
            data={
                "user_id": str(user.id),
                "email": user.email,
                "username": user.username,
                "is_onboarding_complete": (user.is_onboarding_complete),
                "next_step": result["next_step"],
                "tokens": access_token_response(
                    result["tokens"],
                ),
            },
        )
        set_refresh_cookie(
            response,
            refresh_token=result["tokens"]["refresh"],
            expires_at=result["tokens"]["refresh_expires_at"],
        )
        set_device_cookie(response, request)
        return response
