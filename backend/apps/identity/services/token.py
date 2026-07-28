from rest_framework_simplejwt.tokens import RefreshToken

from ..models import User


def issue_token_pair(
    *,
    user: User,
) -> dict:
    """
    Issue a JWT access and refresh token pair.
    """

    if not user.is_active:
        raise ValueError("Inactive users cannot receive tokens.")

    refresh = RefreshToken.for_user(user)

    return {
        "access": str(refresh.access_token),
        "refresh": str(refresh),
        "token_type": "Bearer",
    }
