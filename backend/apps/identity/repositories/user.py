from django.utils import timezone

from ..models import User


def create_user(
    *,
    email=None,
    phone_number=None,
    password=None,
    **extra_fields,
):
    """Persist a new TEED user. Business rules stay in the service layer."""
    return User.objects.create_user(
        email=email,
        phone_number=phone_number,
        password=password,
        **extra_fields,
    )


def mark_user_email_verified(*, user: User) -> User:
    user.is_email_verified = True
    user.save(update_fields=["is_email_verified", "updated_at"])
    return user


def mark_user_phone_verified(*, user: User) -> User:
    user.is_phone_verified = True
    user.save(update_fields=["is_phone_verified", "updated_at"])
    return user


def complete_user_onboarding(
    *,
    user: User,
    username: str,
    phone_number: str,
    country_code: str,
) -> User:
    user.username = username
    user.phone_number = phone_number
    user.country_code = country_code
    user.onboarding_completed_at = timezone.now()
    user.save(
        update_fields=[
            "username",
            "phone_number",
            "country_code",
            "onboarding_completed_at",
            "updated_at",
        ]
    )
    return user
