from common.responses import SuccessResponse
from django.utils.decorators import method_decorator
from django.views.decorators.csrf import csrf_protect
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.views import APIView

from apps.profiles.permissions import IsOnboardingComplete

from .models import WebsiteMedia
from .serializers import (
    WebsiteMediaRegisterSerializer,
    WebsiteMediaReorderSerializer,
    WebsiteMediaSerializer,
    WebsiteMediaUpdateSerializer,
)
from .services import (
    delete_media,
    get_site_for_user,
    register_media,
    reorder_media,
    update_media,
)


class WebsiteBaseAPIView(APIView):
    permission_classes = [IsAuthenticated, IsOnboardingComplete]


class WebsiteMediaListCreateAPIView(WebsiteBaseAPIView):
    serializer_class = WebsiteMediaRegisterSerializer

    def get(self, request, business_id, site_id):
        site = get_site_for_user(
            user=request.user,
            business_id=business_id,
            site_id=site_id,
        )
        media = WebsiteMedia.objects.filter(site=site)
        return SuccessResponse(
            message="Website media retrieved successfully.",
            data={"media": WebsiteMediaSerializer(media, many=True).data},
        )

    @method_decorator(csrf_protect)
    def post(self, request, business_id, site_id):
        serializer = WebsiteMediaRegisterSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        media = register_media(
            actor=request.user,
            business_id=business_id,
            site_id=site_id,
            **serializer.validated_data,
        )
        return SuccessResponse(
            message="Website media registered successfully.",
            data=WebsiteMediaSerializer(media).data,
            status_code=status.HTTP_201_CREATED,
        )


@method_decorator(csrf_protect, name="dispatch")
class WebsiteMediaDetailAPIView(WebsiteBaseAPIView):
    serializer_class = WebsiteMediaUpdateSerializer

    def patch(self, request, business_id, site_id, media_id):
        serializer = WebsiteMediaUpdateSerializer(data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        media = update_media(
            actor=request.user,
            business_id=business_id,
            site_id=site_id,
            media_id=media_id,
            **serializer.validated_data,
        )
        return SuccessResponse(
            message="Website media updated successfully.",
            data=WebsiteMediaSerializer(media).data,
        )

    def delete(self, request, business_id, site_id, media_id):
        delete_media(
            actor=request.user,
            business_id=business_id,
            site_id=site_id,
            media_id=media_id,
        )
        return SuccessResponse(
            message="Website media deleted successfully.",
            data=None,
        )


@method_decorator(csrf_protect, name="dispatch")
class WebsiteMediaReorderAPIView(WebsiteBaseAPIView):
    serializer_class = WebsiteMediaReorderSerializer

    def post(self, request, business_id, site_id):
        serializer = WebsiteMediaReorderSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        media = reorder_media(
            actor=request.user,
            business_id=business_id,
            site_id=site_id,
            media_ids=serializer.validated_data["media_ids"],
        )
        return SuccessResponse(
            message="Website media reordered successfully.",
            data={"media": WebsiteMediaSerializer(media, many=True).data},
        )
