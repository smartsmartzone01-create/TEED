from django.urls import path

from .api import (
    WebsiteMediaDetailAPIView,
    WebsiteMediaListCreateAPIView,
    WebsiteMediaReorderAPIView,
    WebsiteMediaUploadAPIView,
    WebsiteSiteDetailAPIView,
    WebsiteSiteListCreateAPIView,
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
]
