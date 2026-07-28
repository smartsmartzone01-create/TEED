from django.contrib.auth import get_user_model
from django.test import TestCase

from ..selectors import (
    get_user_by_email,
    get_user_by_id,
    get_user_by_phone_number,
    get_user_by_username,
)

User = get_user_model()


class UserSelectorTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            email="member@example.com",
            phone_number="+255700000001",
            password="StrongTestPassword123!",
            username="teedmember",
        )

    def test_get_user_by_id(self):
        self.assertEqual(
            get_user_by_id(
                user_id=self.user.id,
            ),
            self.user,
        )

    def test_get_user_by_email_is_case_insensitive(self):
        self.assertEqual(
            get_user_by_email(
                email="MEMBER@EXAMPLE.COM",
            ),
            self.user,
        )

    def test_get_user_by_username_is_case_insensitive(
        self,
    ):
        self.assertEqual(
            get_user_by_username(
                username="TEEDMEMBER",
            ),
            self.user,
        )

    def test_get_user_by_phone_number(self):
        self.assertEqual(
            get_user_by_phone_number(
                phone_number="+255700000001",
            ),
            self.user,
        )

    def test_selectors_exclude_soft_deleted_users(self):
        self.user.delete()

        self.assertIsNone(
            get_user_by_id(
                user_id=self.user.id,
            )
        )
