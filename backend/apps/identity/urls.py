from django.urls import path

from .api import (
    EmailLoginAPIView,
    EmailRegistrationAPIView,
    EmailVerificationAPIView,
    EmailVerificationResendAPIView,
    OnboardingAPIView,
)

app_name = "identity"

urlpatterns = [
    path(
        "registration/email/",
        EmailRegistrationAPIView.as_view(),
        name="email-registration",
    ),
    path(
        "email-verification/",
        EmailVerificationAPIView.as_view(),
        name="email-verification",
    ),
    path(
        "email-verification/resend/",
        EmailVerificationResendAPIView.as_view(),
        name="email-verification-resend",
    ),
    path("onboarding/", OnboardingAPIView.as_view(), name="onboarding"),
    path("login/email/", EmailLoginAPIView.as_view(), name="email-login"),
]
