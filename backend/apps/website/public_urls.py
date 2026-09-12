from django.urls import path

from .public_api import (
    PublicStorefrontProductDetailAPIView,
    PublicStorefrontProductsAPIView,
    PublicStorefrontSiteAPIView,
)
from .public_auth_api import (
    PublicStorefrontCurrentCustomerAPIView,
    PublicStorefrontEmailLoginAPIView,
    PublicStorefrontEmailRegistrationAPIView,
    PublicStorefrontEmailVerificationAPIView,
    PublicStorefrontPhoneLoginAPIView,
    PublicStorefrontPhoneRegistrationAPIView,
    PublicStorefrontPhoneVerificationAPIView,
    PublicStorefrontSessionLogoutAPIView,
    PublicStorefrontSessionRefreshAPIView,
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
    path(
        "sites/<uuid:site_key>/auth/register/email/",
        PublicStorefrontEmailRegistrationAPIView.as_view(),
        name="auth-register-email",
    ),
    path(
        "sites/<uuid:site_key>/auth/register/phone/",
        PublicStorefrontPhoneRegistrationAPIView.as_view(),
        name="auth-register-phone",
    ),
    path(
        "sites/<uuid:site_key>/auth/verify/email/",
        PublicStorefrontEmailVerificationAPIView.as_view(),
        name="auth-verify-email",
    ),
    path(
        "sites/<uuid:site_key>/auth/verify/phone/",
        PublicStorefrontPhoneVerificationAPIView.as_view(),
        name="auth-verify-phone",
    ),
    path(
        "sites/<uuid:site_key>/auth/login/email/",
        PublicStorefrontEmailLoginAPIView.as_view(),
        name="auth-login-email",
    ),
    path(
        "sites/<uuid:site_key>/auth/login/phone/",
        PublicStorefrontPhoneLoginAPIView.as_view(),
        name="auth-login-phone",
    ),
    path(
        "sites/<uuid:site_key>/auth/session/refresh/",
        PublicStorefrontSessionRefreshAPIView.as_view(),
        name="auth-session-refresh",
    ),
    path(
        "sites/<uuid:site_key>/auth/session/logout/",
        PublicStorefrontSessionLogoutAPIView.as_view(),
        name="auth-session-logout",
    ),
    path(
        "sites/<uuid:site_key>/auth/me/",
        PublicStorefrontCurrentCustomerAPIView.as_view(),
        name="auth-me",
    ),
]
