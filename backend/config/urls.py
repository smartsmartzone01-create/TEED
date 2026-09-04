from django.conf import settings
from django.conf.urls.static import static
from django.contrib import admin
from django.urls import include, path
from drf_spectacular.views import (
    SpectacularAPIView,
    SpectacularRedocView,
    SpectacularSwaggerView,
)

urlpatterns = [
    path("admin/", admin.site.urls),
    path("schema/", SpectacularAPIView.as_view(), name="schema"),
    path("swagger/", SpectacularSwaggerView.as_view(), name="swagger-ui"),
    path("redoc/", SpectacularRedocView.as_view(), name="redoc"),
    path("api/v1/identity/", include("apps.identity.urls")),
    path("api/v1/profiles/", include("apps.profiles.urls")),
    path("api/v1/security/", include("apps.security.urls")),
    path("api/v1/notifications/", include("apps.notifications.urls")),
    path("api/v1/workspaces/", include("apps.workspaces.urls")),
    path("api/v1/commerce/", include("apps.commerce.urls")),
    path("api/v1/intelligence/", include("apps.intelligence.urls")),
]

if settings.DEBUG:
    urlpatterns += static(
        settings.MEDIA_URL,
        document_root=settings.MEDIA_ROOT,
    )
