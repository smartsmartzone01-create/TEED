from ..models import ExternalIdentity, User


def get_external_identity(
    *,
    provider: str,
    subject: str,
):
    return ExternalIdentity.objects.select_related("user").filter(
        provider=provider,
        subject=subject,
    ).first()


def has_external_identity(*, user: User) -> bool:
    return ExternalIdentity.objects.filter(user=user).exists()
