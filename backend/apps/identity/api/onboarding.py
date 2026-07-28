from common.responses import SuccessResponse
from rest_framework.permissions import IsAuthenticated
from rest_framework.views import APIView

from ..serializers import OnboardingSerializer
from ..services import complete_onboarding


class OnboardingAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        serializer = OnboardingSerializer(
            data=request.data,
        )
        serializer.is_valid(
            raise_exception=True,
        )

        user = complete_onboarding(
            user=request.user,
            **serializer.validated_data,
        )

        return SuccessResponse(
            message="Onboarding completed successfully.",
            data={
                "user_id": str(user.id),
                "email": user.email,
                "username": user.username,
                "phone_number": user.phone_number,
                "country_code": user.country_code,
                "is_onboarding_complete": True,
                "next_step": "dashboard",
            },
        )
