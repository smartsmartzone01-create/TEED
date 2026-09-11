from common.responses import SuccessResponse
from django.utils.decorators import method_decorator
from django.views.decorators.csrf import csrf_protect
from rest_framework.permissions import IsAuthenticated
from rest_framework.views import APIView

from apps.profiles.permissions import IsOnboardingComplete

from .commerce_connection import (
    disconnect_commerce_variant,
    import_commerce_products,
    list_commerce_catalog,
)
from .commerce_serializers import (
    WebsiteCommerceImportSerializer,
    WebsiteCommerceProductSerializer,
)
from .serializers import WebsiteVariantSerializer


class WebsiteCommerceBaseAPIView(APIView):
    permission_classes = [IsAuthenticated, IsOnboardingComplete]


class WebsiteCommerceCatalogAPIView(WebsiteCommerceBaseAPIView):
    def get(self, request, business_id, site_id):
        products = list_commerce_catalog(
            user=request.user,
            business_id=business_id,
            site_id=site_id,
        )
        return SuccessResponse(
            message="Commerce products retrieved successfully.",
            data={
                "products": WebsiteCommerceProductSerializer(products, many=True).data,
            },
        )


class WebsiteCommerceImportAPIView(WebsiteCommerceBaseAPIView):
    serializer_class = WebsiteCommerceImportSerializer

    @method_decorator(csrf_protect)
    def post(self, request, business_id, site_id):
        serializer = WebsiteCommerceImportSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        result = import_commerce_products(
            actor=request.user,
            business_id=business_id,
            site_id=site_id,
            product_ids=serializer.validated_data["product_ids"],
        )
        return SuccessResponse(
            message="Commerce products imported successfully.",
            data=result,
        )


class WebsiteCommerceDisconnectAPIView(WebsiteCommerceBaseAPIView):
    @method_decorator(csrf_protect)
    def post(self, request, business_id, site_id, listing_id, variant_id):
        variant = disconnect_commerce_variant(
            actor=request.user,
            business_id=business_id,
            site_id=site_id,
            listing_id=listing_id,
            variant_id=variant_id,
        )
        return SuccessResponse(
            message="Website variant disconnected from Commerce successfully.",
            data=WebsiteVariantSerializer(variant).data,
        )
