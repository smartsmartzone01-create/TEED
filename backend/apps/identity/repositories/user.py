from ..models import User

from django.utils import timezone


def create_user(
    *,
    email=None,
    phone_number=None,
    password=None,
    **extra_fields,
):
    """
    Persist a new TEED user.

    Business rules and transaction boundaries belong to
    the service layer, not this repository.
    """

    return User.objects.create_user(
        email=email,
        phone_number=phone_number,
        password=password,
        **extra_fields,
    )

def mark_user_email_verified(
    *,
    user: User,
) -> User:
    """
    Mark the user's current email address as verified.
    """

    user.is_email_verified = True
    user.save(
        update_fields=[
            "is_email_verified",
            "updated_at",
        ]
    )

    return user

def complete_user_onboarding(
    *,
    user: User,
    username: str,
    phone_number: str,
    country_code: str,
) -> User:
    """
    Persist the required onboarding identity fields.
    """

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