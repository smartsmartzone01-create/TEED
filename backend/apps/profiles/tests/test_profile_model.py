from django.db import IntegrityError, transaction
from django.test import TestCase

from ..models import UserProfile
from .factories import create_profile_user


class UserProfileModelTests(TestCase):
    def test_profile_has_one_record_per_user(self):
        user = create_profile_user()
        UserProfile.objects.create(
            user=user,
            region="Dar es Salaam",
        )

        self.assertEqual(user.profile.region, "Dar es Salaam")
        with self.assertRaises(IntegrityError), transaction.atomic():
            UserProfile.objects.create(user=user)
