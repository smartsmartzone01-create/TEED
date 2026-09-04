from common.responses import SuccessResponse
from rest_framework.permissions import IsAuthenticated
from rest_framework.views import APIView

from ..serializers import OnboardingSerializer
from ..services import complete_onboarding, get_account_protection_recommendation


class OnboardingAPIView(APIView):
    serializer_class = OnboardingSerializer
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
                "is_email_verified": user.is_email_verified,
                "is_phone_verified": user.is_phone_verified,
                "is_onboarding_complete": True,
                "next_step": "dashboard",
                "recommended_step": get_account_protection_recommendation(user=user),
            },
        )
