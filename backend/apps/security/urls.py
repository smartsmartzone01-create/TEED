from django.urls import path

from .api import (
    OtherSessionsAPIView,
    PasswordChangeAPIView,
    SecurityActivityAPIView,
    SecurityOverviewAPIView,
    SessionDetailAPIView,
    SessionListAPIView,
)

app_name = "security"
urlpatterns = [
    path("me/overview/", SecurityOverviewAPIView.as_view(), name="overview"),
    path("me/password/", PasswordChangeAPIView.as_view(), name="password"),
    path("me/sessions/", SessionListAPIView.as_view(), name="sessions"),
    path(
        "me/sessions/revoke-others/",
        OtherSessionsAPIView.as_view(),
        name="revoke-others",
    ),
    path(
        "me/sessions/<uuid:session_id>/",
        SessionDetailAPIView.as_view(),
        name="session-detail",
    ),
    path("me/activity/", SecurityActivityAPIView.as_view(), name="activity"),
]
