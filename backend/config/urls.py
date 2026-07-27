
from django.contrib import admin  # pyright: ignore[reportMissingModuleSource]
from django.urls import include, path 
from django.urls import path  # pyright: ignore[reportMissingModuleSource]
from drf_spectacular.views import (
    SpectacularAPIView,
    SpectacularSwaggerView,
    SpectacularRedocView,
) # pyright: ignore[reportMissingModuleSource]

urlpatterns = [
    path('admin/', admin.site.urls),
    path('schema/', SpectacularAPIView.as_view(), name='schema'),
    path('swagger/', SpectacularSwaggerView.as_view(), name='swagger-ui'),
    path('redoc/', SpectacularRedocView.as_view(), name='redoc'),
    path("api/v1/identity/",include("apps.identity.urls"),),
]
