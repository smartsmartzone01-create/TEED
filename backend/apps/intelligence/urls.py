from django.urls import path

from .api import IntelligencePartnerAPIView

app_name = "intelligence"
urlpatterns = [
    path(
        "businesses/<uuid:business_id>/partner/",
        IntelligencePartnerAPIView.as_view(),
        name="partner",
    ),
]
