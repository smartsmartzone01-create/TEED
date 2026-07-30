from common.http import get_request_metadata
from common.responses import SuccessResponse
from rest_framework.parsers import FormParser, JSONParser, MultiPartParser
from rest_framework.permissions import IsAuthenticated
from rest_framework.views import APIView

from ..permissions import IsOnboardingComplete
from ..repositories import get_user_profile
from ..selectors import build_contact_summary, build_profile_overview
from ..serializers import (
    ContactInformationSerializer,
    EmptyProfileActionSerializer,
    PersonalInformationSerializer,
    ProfileOverviewSerializer,
    ProfileUpdateSerializer,
)
from ..services import delete_profile_image, update_user_profile


def build_personal_information(*, request, profile):
    image_url = None
    if profile and profile.profile_image:
        image_url = request.build_absolute_uri(profile.profile_image.url)

    user = request.user
    return {
        "id": user.id,
        "profile_image_url": image_url,
        "first_name": user.first_name,
        "last_name": user.last_name,
        "username": user.username,
        "country_code": user.country_code,
        "region": profile.region if profile else "",
        "email": user.email,
        "phone_number": user.phone_number,
        "is_email_verified": user.is_email_verified,
        "is_phone_verified": user.is_phone_verified,
        "created_at": user.created_at,
    }


class ProfileOverviewAPIView(APIView):
    permission_classes = [IsAuthenticated, IsOnboardingComplete]
    serializer_class = ProfileOverviewSerializer

    def get(self, request):
        profile = get_user_profile(user=request.user)
        return SuccessResponse(
            message="Profile overview retrieved successfully.",
            data=build_profile_overview(
                user=request.user,
                profile=profile,
            ),
        )


class PersonalInformationAPIView(APIView):
    permission_classes = [IsAuthenticated, IsOnboardingComplete]
    serializer_class = PersonalInformationSerializer

    def get(self, request):
        profile = get_user_profile(user=request.user)
        serializer = PersonalInformationSerializer(
            build_personal_information(
                request=request,
                profile=profile,
            )
        )
        return SuccessResponse(
            message="Personal information retrieved successfully.",
            data=serializer.data,
        )


class ProfileUpdateAPIView(APIView):
    permission_classes = [IsAuthenticated, IsOnboardingComplete]
    parser_classes = [JSONParser, FormParser, MultiPartParser]
    serializer_class = ProfileUpdateSerializer

    def patch(self, request):
        serializer = ProfileUpdateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        profile = update_user_profile(
            user=request.user,
            validated_data=serializer.validated_data,
            audit_metadata=get_request_metadata(request),
        )
        output = PersonalInformationSerializer(
            build_personal_information(
                request=request,
                profile=profile,
            )
        )
        return SuccessResponse(
            message="Profile updated successfully.",
            data=output.data,
        )


class ProfileImageAPIView(APIView):
    permission_classes = [IsAuthenticated, IsOnboardingComplete]
    serializer_class = EmptyProfileActionSerializer

    def delete(self, request):
        delete_profile_image(
            user=request.user,
            audit_metadata=get_request_metadata(request),
        )
        return SuccessResponse(
            message="Profile image removed successfully.",
            data=None,
        )


class ContactInformationAPIView(APIView):
    permission_classes = [IsAuthenticated, IsOnboardingComplete]
    serializer_class = ContactInformationSerializer

    def get(self, request):
        return SuccessResponse(
            message="Contact information retrieved successfully.",
            data=build_contact_summary(user=request.user),
        )
