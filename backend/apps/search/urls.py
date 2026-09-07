from django.urls import path

from .api import WorkspaceSearchAPIView

app_name = "search"
urlpatterns = [
    path(
        "businesses/<uuid:business_id>/",
        WorkspaceSearchAPIView.as_view(),
        name="workspace-search",
    ),
]
