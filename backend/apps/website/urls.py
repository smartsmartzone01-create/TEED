from django.urls import path

from .api import (
    WebsiteListingDetailAPIView,
    WebsiteListingListCreateAPIView,
    WebsiteMediaDetailAPIView,
    WebsiteMediaListCreateAPIView,
    WebsiteMediaReorderAPIView,
    WebsiteMediaUploadAPIView,
    WebsiteSiteDetailAPIView,
    WebsiteSiteListCreateAPIView,
    WebsiteVariantDetailAPIView,
    WebsiteVariantListCreateAPIView,
)

app_name = "website"

urlpatterns = [
    path(
        "businesses/<uuid:business_id>/sites/",
        WebsiteSiteListCreateAPIView.as_view(),
        name="site-list",
    ),
    path(
        "businesses/<uuid:business_id>/sites/<uuid:site_id>/",
        WebsiteSiteDetailAPIView.as_view(),
        name="site-detail",
    ),
    path(
        "businesses/<uuid:business_id>/sites/<uuid:site_id>/media/",
        WebsiteMediaListCreateAPIView.as_view(),
        name="media-list",
    ),
    path(
        "businesses/<uuid:business_id>/sites/<uuid:site_id>/media/upload/",
        WebsiteMediaUploadAPIView.as_view(),
        name="media-upload",
    ),
    path(
        "businesses/<uuid:business_id>/sites/<uuid:site_id>/media/reorder/",
        WebsiteMediaReorderAPIView.as_view(),
        name="media-reorder",
    ),
    path(
        "businesses/<uuid:business_id>/sites/<uuid:site_id>/media/<uuid:media_id>/",
        WebsiteMediaDetailAPIView.as_view(),
        name="media-detail",
    ),
    path(
        "businesses/<uuid:business_id>/sites/<uuid:site_id>/listings/",
        WebsiteListingListCreateAPIView.as_view(),
        name="listing-list",
    ),
    path(
        "businesses/<uuid:business_id>/sites/<uuid:site_id>/listings/<uuid:listing_id>/",
        WebsiteListingDetailAPIView.as_view(),
        name="listing-detail",
    ),
    path(
        "businesses/<uuid:business_id>/sites/<uuid:site_id>/listings/<uuid:listing_id>/variants/",
        WebsiteVariantListCreateAPIView.as_view(),
        name="variant-list",
    ),
    path(
        "businesses/<uuid:business_id>/sites/<uuid:site_id>/listings/<uuid:listing_id>/variants/<uuid:variant_id>/",
        WebsiteVariantDetailAPIView.as_view(),
        name="variant-detail",
    ),
]
