from django.contrib.auth import get_user_model
from django.utils import timezone


def create_user(email, **overrides):
    values = {
        "email": email,
        "password": "StrongTestPassword123!",
        "username": email.split("@")[0],
        "is_email_verified": True,
        "onboarding_completed_at": timezone.now(),
    }
    values.update(overrides)
    return get_user_model().objects.create_user(**values)
