from ..models import ExternalIdentity, User


def create_external_identity(
    *,
    user: User,
    provider: str,
    subject: str,
    email_snapshot: str = "",
) -> ExternalIdentity:
    return ExternalIdentity.objects.create(
        user=user,
        provider=provider,
        subject=subject,
        email_snapshot=email_snapshot,
    )


def update_external_identity_email_snapshot(
    *,
    external_identity: ExternalIdentity,
    email_snapshot: str,
) -> ExternalIdentity:
    if external_identity.email_snapshot == email_snapshot:
        return external_identity
    external_identity.email_snapshot = email_snapshot
    external_identity.save(
        update_fields=[
            "email_snapshot",
            "updated_at",
        ]
    )
    return external_identity
