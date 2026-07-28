from uuid import UUID

from ..models import User


def get_user_by_id(
    *,
    user_id: UUID,
):
    """
    Return an active user by UUID.
    """

    return User.objects.filter(
        id=user_id,
    ).first()


def get_user_by_email(
    *,
    email: str,
):
    """
    Return an active user by case-insensitive email.
    """

    return User.objects.filter(
        email__iexact=email.strip(),
    ).first()


def get_user_by_phone_number(
    *,
    phone_number: str,
):
    """
    Return an active user by normalized phone number.
    """

    return User.objects.filter(
        phone_number=phone_number.strip(),
    ).first()


def get_user_by_username(
    *,
    username: str,
):
    """
    Return an active user by case-insensitive username.
    """

    return User.objects.filter(
        username__iexact=username.strip(),
    ).first()
