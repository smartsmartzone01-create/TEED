from django.urls import path

from .api import (
    CurrentSessionAPIView,
    EmailLoginAPIView,
    EmailRegistrationAPIView,
    EmailVerificationAPIView,
    EmailVerificationResendAPIView,
    OnboardingAPIView,
    PasswordResetConfirmAPIView,
    PasswordResetRequestAPIView,
    PasswordResetVerifyAPIView,
    PhoneLoginAPIView,
    PhoneRegistrationAPIView,
    PhoneVerificationAPIView,
    PhoneVerificationResendAPIView,
    SessionCSRFAPIView,
    SessionLogoutAllAPIView,
    SessionLogoutAPIView,
    SessionRefreshAPIView,
)

app_name = "identity"

urlpatterns = [
    path("registration/email/", EmailRegistrationAPIView.as_view(), name="email-registration"),
    path("registration/phone/", PhoneRegistrationAPIView.as_view(), name="phone-registration"),
    path("email-verification/", EmailVerificationAPIView.as_view(), name="email-verification"),
    path(
        "email-verification/resend/",
        EmailVerificationResendAPIView.as_view(),
        name="email-verification-resend",
    ),
    path("phone-verification/", PhoneVerificationAPIView.as_view(), name="phone-verification"),
    path(
        "phone-verification/resend/",
        PhoneVerificationResendAPIView.as_view(),
        name="phone-verification-resend",
    ),
    path("onboarding/", OnboardingAPIView.as_view(), name="onboarding"),
    path("login/email/", EmailLoginAPIView.as_view(), name="email-login"),
    path("login/phone/", PhoneLoginAPIView.as_view(), name="phone-login"),
    path(
        "password-reset/request/",
        PasswordResetRequestAPIView.as_view(),
        name="password-reset-request",
    ),
    path(
        "password-reset/verify/",
        PasswordResetVerifyAPIView.as_view(),
        name="password-reset-verify",
    ),
    path(
        "password-reset/confirm/",
        PasswordResetConfirmAPIView.as_view(),
        name="password-reset-confirm",
    ),
    path("session/csrf/", SessionCSRFAPIView.as_view(), name="session-csrf"),
    path("session/refresh/", SessionRefreshAPIView.as_view(), name="session-refresh"),
    path("session/logout/", SessionLogoutAPIView.as_view(), name="session-logout"),
    path("session/logout-all/", SessionLogoutAllAPIView.as_view(), name="session-logout-all"),
    path("session/me/", CurrentSessionAPIView.as_view(), name="session-current"),
]
