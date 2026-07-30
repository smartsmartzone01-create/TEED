from django.urls import path

from .api import (
    ContactInformationAPIView,
    PersonalInformationAPIView,
    ProfileImageAPIView,
    ProfileOverviewAPIView,
    ProfileUpdateAPIView,
)

app_name = "profiles"

urlpatterns = [
    path("me/overview/", ProfileOverviewAPIView.as_view(), name="overview"),
    path(
        "me/personal-information/",
        PersonalInformationAPIView.as_view(),
        name="personal-information",
    ),
    path("me/", ProfileUpdateAPIView.as_view(), name="update"),
    path("me/image/", ProfileImageAPIView.as_view(), name="image"),
    path(
        "me/contacts/",
        ContactInformationAPIView.as_view(),
        name="contacts",
    ),
]
