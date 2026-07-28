from ..models import (
    EmailVerificationChallenge,
    User,
)


def get_latest_email_verification_challenge(
    *,
    user: User,
    purpose: str = (EmailVerificationChallenge.Purpose.REGISTRATION),
):
    """
    Return the latest unconsumed verification challenge.

    The model's default manager automatically excludes
    soft-deleted challenges.
    """

    return (
        EmailVerificationChallenge.objects.filter(
            user=user,
            purpose=purpose,
            consumed_at__isnull=True,
        )
        .order_by("-created_at")
        .first()
    )
