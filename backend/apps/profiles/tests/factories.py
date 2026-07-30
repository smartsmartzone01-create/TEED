from django.contrib.auth import get_user_model
from django.utils import timezone


def create_profile_user(**overrides):
    values = {
        "email": "profile@example.com",
        "password": "StrongTestPassword123!",
        "username": "profilemember",
        "phone_number": "+255712345678",
        "country_code": "TZ",
        "first_name": "Profile",
        "last_name": "Member",
        "is_email_verified": True,
        "onboarding_completed_at": timezone.now(),
    }
    values.update(overrides)
    return get_user_model().objects.create_user(**values)
