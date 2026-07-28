from common.responses import SuccessResponse
from rest_framework.permissions import AllowAny
from rest_framework.views import APIView

from ..serializers import EmailLoginSerializer
from ..services import login_email_user
from ..throttles import LoginEmailThrottle, LoginIPThrottle


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
        )
        user = result["user"]

        return SuccessResponse(
            message="Signed in successfully.",
            data={
                "user_id": str(user.id),
                "email": user.email,
                "username": user.username,
                "is_onboarding_complete": (user.is_onboarding_complete),
                "next_step": result["next_step"],
                "tokens": result["tokens"],
            },
        )
