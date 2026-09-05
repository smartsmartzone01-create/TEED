from django.urls import path

from .public_api import (
    PublicStorefrontProductDetailAPIView,
    PublicStorefrontProductsAPIView,
    PublicStorefrontSiteAPIView,
)

app_name = "website-public"

urlpatterns = [
    path(
        "sites/<uuid:site_key>/",
        PublicStorefrontSiteAPIView.as_view(),
        name="site",
    ),
    path(
        "sites/<uuid:site_key>/products/",
        PublicStorefrontProductsAPIView.as_view(),
        name="products",
    ),
    path(
        "sites/<uuid:site_key>/products/<slug:slug>/",
        PublicStorefrontProductDetailAPIView.as_view(),
        name="product-detail",
    ),
]
