from common.responses import SuccessResponse
from rest_framework.permissions import IsAuthenticated
from rest_framework.views import APIView

from apps.profiles.permissions import IsOnboardingComplete

from .serializers import UserPreferenceSerializer
from .services import get_or_create_user_preferences, update_user_preferences


class UserPreferenceAPIView(APIView):
    permission_classes = [IsAuthenticated, IsOnboardingComplete]
    serializer_class = UserPreferenceSerializer

    def get(self, request):
        preferences = get_or_create_user_preferences(user=request.user)
        serializer = UserPreferenceSerializer(preferences)
        return SuccessResponse(
            message="Preferences retrieved successfully.",
            data=serializer.data,
        )

    def patch(self, request):
        current = get_or_create_user_preferences(user=request.user)
        serializer = UserPreferenceSerializer(
            current,
            data=request.data,
            partial=True,
        )
        serializer.is_valid(raise_exception=True)
        preferences = update_user_preferences(
            user=request.user,
            validated_data=serializer.validated_data,
        )
        output = UserPreferenceSerializer(preferences)
        return SuccessResponse(
            message="Preferences updated successfully.",
            data=output.data,
        )
