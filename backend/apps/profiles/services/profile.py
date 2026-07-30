from common.exceptions.modules.identity import UsernameAlreadyTaken
from django.db import IntegrityError, transaction

from apps.identity.models import IdentitySecurityEvent
from apps.identity.selectors import get_user_by_username
from apps.identity.services import record_identity_security_event

from ..repositories import (
    get_or_create_user_profile,
    get_user_profile,
    save_profile_changes,
)

IDENTITY_EDITABLE_FIELDS = {
    "country_code",
    "first_name",
    "last_name",
    "username",
}
PROFILE_EDITABLE_FIELDS = {
    "profile_image",
    "region",
}


def update_user_profile(*, user, validated_data, audit_metadata=None):
    username = validated_data.get("username")
    existing_user = (
        get_user_by_username(username=username) if username is not None else None
    )
    if existing_user and existing_user.id != user.id:
        raise UsernameAlreadyTaken()

    identity_changes = {
        field: value
        for field, value in validated_data.items()
        if field in IDENTITY_EDITABLE_FIELDS
    }
    profile_changes = {
        field: value
        for field, value in validated_data.items()
        if field in PROFILE_EDITABLE_FIELDS
    }

    try:
        with transaction.atomic():
            profile = get_or_create_user_profile(user=user)
            old_image = (
                profile.profile_image
                if "profile_image" in profile_changes and profile.profile_image
                else None
            )

            if identity_changes:
                for field, value in identity_changes.items():
                    setattr(user, field, value)
                user.save(update_fields=[*identity_changes, "updated_at"])

            if profile_changes:
                save_profile_changes(
                    profile=profile,
                    fields=profile_changes,
                )

            if old_image and old_image.name != profile.profile_image.name:
                transaction.on_commit(lambda: old_image.delete(save=False))

            record_identity_security_event(
                user=user,
                event_type=IdentitySecurityEvent.EventType.PROFILE_UPDATED,
                outcome=IdentitySecurityEvent.Outcome.SUCCESS,
                metadata={"changed_fields": sorted(validated_data)},
                **(audit_metadata or {}),
            )
    except IntegrityError as exc:
        if username is not None:
            conflicting_user = get_user_by_username(username=username)
            if conflicting_user and conflicting_user.id != user.id:
                raise UsernameAlreadyTaken() from exc
        raise

    return profile


def delete_profile_image(*, user, audit_metadata=None):
    profile = get_user_profile(user=user)
    if profile is None:
        return None

    old_image = profile.profile_image
    if not old_image:
        return profile

    with transaction.atomic():
        profile.profile_image = None
        profile.save(update_fields=["profile_image", "updated_at"])
        record_identity_security_event(
            user=user,
            event_type=IdentitySecurityEvent.EventType.PROFILE_IMAGE_REMOVED,
            outcome=IdentitySecurityEvent.Outcome.SUCCESS,
            metadata={"changed_fields": ["profile_image"]},
            **(audit_metadata or {}),
        )
        transaction.on_commit(lambda: old_image.delete(save=False))

    return profile
