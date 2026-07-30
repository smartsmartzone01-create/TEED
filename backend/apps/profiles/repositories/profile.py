from ..models import UserProfile


def get_user_profile(*, user):
    return UserProfile.objects.filter(user=user).first()


def get_or_create_user_profile(*, user):
    profile, _ = UserProfile.objects.get_or_create(user=user)
    return profile


def save_profile_changes(*, profile, fields):
    for field, value in fields.items():
        setattr(profile, field, value)

    profile.save(update_fields=[*fields, "updated_at"])
    return profile
