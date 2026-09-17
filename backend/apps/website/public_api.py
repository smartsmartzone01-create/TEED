from common.responses import SuccessResponse
from django.db.models import F, Prefetch
from django.shortcuts import get_object_or_404
from rest_framework import status
from rest_framework.permissions import AllowAny
from rest_framework.throttling import ScopedRateThrottle
from rest_framework.views import APIView

from .contracts import serialize_listing, serialize_site
from .models import WebsiteListing, WebsiteSite, WebsiteVariant
from .order_services import create_public_order, serialize_public_order
from .public_order_serializers import PublicStorefrontOrderCreateSerializer


def public_site(site_key):
    return get_object_or_404(
        WebsiteSite.objects.select_related("business"),
        public_key=site_key,
        is_published=True,
        business__status="active",
    )


def public_variants():
    return WebsiteVariant.objects.filter(is_published=True).select_related(
        "commerce_product",
        "media",
    )


def public_listings(site):
    return (
        WebsiteListing.objects.filter(site=site, is_published=True)
        .select_related("primary_media", "discover_media")
        .prefetch_related(
            "story_blocks__media",
            Prefetch("variants", queryset=public_variants()),
        )
    )


def newest_listing_ids(site):
    return set(
        public_listings(site)
        .order_by(F("published_at").desc(nulls_last=True), "-created_at", "-id")
        .values_list("id", flat=True)[:5]
    )


def serialize_public_listing(listing, *, newest_ids):
    payload = serialize_listing(listing)
    published_at = listing.published_at or listing.created_at
    payload["publishedAt"] = published_at.isoformat()
    payload["detailViewCount"] = listing.detail_view_count
    payload["isNew"] = listing.id in newest_ids
    return payload


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
        listings = public_listings(site).order_by("sort_order", "created_at", "id")
        newest_ids = newest_listing_ids(site)
        return SuccessResponse(
            message="Storefront products retrieved successfully.",
            data={
                "products": [
                    serialize_public_listing(listing, newest_ids=newest_ids)
                    for listing in listings
                ]
            },
        )


class PublicStorefrontProductDetailAPIView(PublicStorefrontBaseAPIView):
    def get(self, request, site_key, slug):
        site = public_site(site_key)
        listing = get_object_or_404(public_listings(site), slug=slug)
        WebsiteListing.objects.filter(id=listing.id).update(
            detail_view_count=F("detail_view_count") + 1
        )
        listing.detail_view_count += 1
        return SuccessResponse(
            message="Storefront product retrieved successfully.",
            data=serialize_public_listing(listing, newest_ids=newest_listing_ids(site)),
        )


class PublicStorefrontOrdersAPIView(PublicStorefrontBaseAPIView):
    def post(self, request, site_key):
        site = public_site(site_key)
        serializer = PublicStorefrontOrderCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        order = create_public_order(site=site, validated_data=serializer.validated_data)
        return SuccessResponse(
            message="Order received successfully.",
            data=serialize_public_order(order),
            status_code=status.HTTP_201_CREATED,
        )
