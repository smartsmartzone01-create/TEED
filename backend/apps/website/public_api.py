from common.responses import SuccessResponse
from django.db.models import Prefetch
from django.shortcuts import get_object_or_404
from rest_framework.permissions import AllowAny
from rest_framework.throttling import ScopedRateThrottle
from rest_framework.views import APIView

from .contracts import serialize_listing, serialize_site
from .models import WebsiteListing, WebsiteSite, WebsiteVariant


def public_site(site_key):
    return get_object_or_404(
        WebsiteSite.objects.select_related("business"),
        public_key=site_key,
        is_published=True,
        business__status="active",
    )


class PublicStorefrontBaseAPIView(APIView):
    authentication_classes = []
    permission_classes = [AllowAny]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "storefront_public"


class PublicStorefrontSiteAPIView(PublicStorefrontBaseAPIView):
    def get(self, request, site_key):
        site = public_site(site_key)
        return SuccessResponse(
            message="Storefront site retrieved successfully.",
            data=serialize_site(site),
        )


class PublicStorefrontProductsAPIView(PublicStorefrontBaseAPIView):
    def get(self, request, site_key):
        site = public_site(site_key)
        variants = WebsiteVariant.objects.filter(is_published=True).select_related(
            "commerce_product"
        )
        listings = (
            WebsiteListing.objects.filter(site=site, is_published=True)
            .prefetch_related(Prefetch("variants", queryset=variants))
            .order_by("sort_order", "created_at", "id")
        )
        return SuccessResponse(
            message="Storefront products retrieved successfully.",
            data={"products": [serialize_listing(listing) for listing in listings]},
        )


class PublicStorefrontProductDetailAPIView(PublicStorefrontBaseAPIView):
    def get(self, request, site_key, slug):
        site = public_site(site_key)
        variants = WebsiteVariant.objects.filter(is_published=True).select_related(
            "commerce_product"
        )
        listing = get_object_or_404(
            WebsiteListing.objects.filter(site=site, is_published=True).prefetch_related(
                Prefetch("variants", queryset=variants)
            ),
            slug=slug,
        )
        return SuccessResponse(
            message="Storefront product retrieved successfully.",
            data=serialize_listing(listing),
        )
