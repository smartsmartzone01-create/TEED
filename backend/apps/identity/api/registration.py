from rest_framework import status
from rest_framework.permissions import AllowAny
from rest_framework.views import APIView

from common.responses import SuccessResponse

from ..serializers import (
    EmailRegistrationSerializer,
)
from ..services import register_email_user


class EmailRegistrationAPIView(APIView):
    permission_classes = [AllowAny]
    authentication_classes = []

    def post(self, request):
        serializer = EmailRegistrationSerializer(
            data=request.data,
        )
        serializer.is_valid(
            raise_exception=True,
        )

        user = register_email_user(
            **serializer.validated_data,
        )

        return SuccessResponse(
            message=(
                "Registration successful. "
                "Verify your email to continue."
            ),
            data={
                "user_id": str(user.id),
                "email": user.email,
                "next_step": "verify_email",
            },
            status_code=status.HTTP_201_CREATED,
        )