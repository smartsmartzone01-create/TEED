from common.exceptions.modules.identity import UsernameAlreadyTaken
from django.test import TestCase

from ..models import UserProfile
from ..services import update_user_profile
from .factories import create_profile_user


class ProfileServiceTests(TestCase):
    def test_update_changes_identity_and_profile_owned_fields(self):
        user = create_profile_user()

        profile = update_user_profile(
            user=user,
            validated_data={
                "first_name": "Updated",
                "username": "updated_member",
                "country_code": "KE",
                "region": "Nairobi",
            },
        )

        user.refresh_from_db()
        self.assertEqual(user.first_name, "Updated")
        self.assertEqual(user.username, "updated_member")
        self.assertEqual(user.country_code, "KE")
        self.assertEqual(profile.region, "Nairobi")

    def test_duplicate_username_is_rejected(self):
        user = create_profile_user()
        create_profile_user(
            email="other@example.com",
            username="existing_name",
            phone_number="+255713345678",
        )

        with self.assertRaises(UsernameAlreadyTaken):
            update_user_profile(
                user=user,
                validated_data={"username": "EXISTING_NAME"},
            )

        self.assertFalse(UserProfile.objects.filter(user=user).exists())
