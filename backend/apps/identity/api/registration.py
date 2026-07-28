from common.responses import SuccessResponse
from rest_framework import status
from rest_framework.permissions import AllowAny
from rest_framework.views import APIView

from ..serializers import (
    EmailRegistrationSerializer,
)
from ..services import register_email_user
from ..throttles import EmailRegistrationIPThrottle
from .session_cookies import get_request_session_metadata


class EmailRegistrationAPIView(APIView):
    serializer_class = EmailRegistrationSerializer
    permission_classes = [AllowAny]
    authentication_classes = []
    throttle_classes = [EmailRegistrationIPThrottle]

    def post(self, request):
        serializer = EmailRegistrationSerializer(
            data=request.data,
        )
        serializer.is_valid(
            raise_exception=True,
        )

        user = register_email_user(
            **serializer.validated_data,
            **get_request_session_metadata(request),
        )

        return SuccessResponse(
            message=("Registration successful. Verify your email to continue."),
            data={
                "user_id": str(user.id),
                "email": user.email,
                "next_step": "verify_email",
            },
            status_code=status.HTTP_201_CREATED,
        )
