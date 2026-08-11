from django.urls import path

from .api import (
    NotificationListAPIView,
    NotificationReadAllAPIView,
    NotificationReadAPIView,
)

app_name = "notifications"
urlpatterns = [
    path("me/", NotificationListAPIView.as_view(), name="list"),
    path("me/read-all/", NotificationReadAllAPIView.as_view(), name="read-all"),
    path(
        "me/<uuid:notification_id>/read/",
        NotificationReadAPIView.as_view(),
        name="read",
    ),
]
