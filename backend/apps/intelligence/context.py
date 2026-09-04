from dataclasses import dataclass
from datetime import date
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError

from django.conf import settings
from django.utils import timezone

from apps.workspaces.business.models import BusinessSettings

SUPPORTED_INTELLIGENCE_LOCALES = {"en", "sw"}


@dataclass(frozen=True)
class IntelligenceContext:
    business_id: str
    business_name: str
    locale: str
    timezone_name: str
    local_date: date


def build_intelligence_context(*, membership, requested_locale=None):
    business = membership.business
    business_settings = (
        BusinessSettings.objects.filter(business=business)
        .values("language_code", "timezone")
        .first()
        or {}
    )

    locale = requested_locale or business_settings.get("language_code") or "en"
    if locale not in SUPPORTED_INTELLIGENCE_LOCALES:
        locale = "en"

    timezone_name = business_settings.get("timezone") or settings.TIME_ZONE
    try:
        business_timezone = ZoneInfo(timezone_name)
    except ZoneInfoNotFoundError:
        timezone_name = settings.TIME_ZONE
        business_timezone = ZoneInfo(timezone_name)

    return IntelligenceContext(
        business_id=str(business.id),
        business_name=business.name,
        locale=locale,
        timezone_name=timezone_name,
        local_date=timezone.localdate(timezone=business_timezone),
    )
