from django.db import transaction

from .models import UserPreference


@transaction.atomic
def get_or_create_user_preferences(*, user):
    preferences, _ = UserPreference.objects.get_or_create(user=user)
    return preferences


@transaction.atomic
def update_user_preferences(*, user, validated_data):
    preferences = get_or_create_user_preferences(user=user)
    changed_fields = []

    for field, value in validated_data.items():
        if getattr(preferences, field) != value:
            setattr(preferences, field, value)
            changed_fields.append(field)

    if changed_fields:
        preferences.save(update_fields=[*changed_fields, "updated_at"])

    return preferences
