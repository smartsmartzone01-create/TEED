from django.contrib.auth import get_user_model
from django.test import TestCase

User = get_user_model()


class UserManagerTests(TestCase):
    def test_create_email_user(self):
        user = User.objects.create_user(
            email="USER@Example.COM",
            password="StrongTestPassword123!",
        )

        self.assertEqual(
            user.email,
            "user@example.com",
        )
        self.assertIsNone(user.username)
        self.assertTrue(
            user.check_password(
                "StrongTestPassword123!",
            )
        )
        self.assertFalse(user.is_staff)
        self.assertFalse(user.is_superuser)

    def test_create_phone_user(self):
        user = User.objects.create_user(
            phone_number="+255712345678",
        )

        self.assertEqual(
            user.phone_number,
            "+255712345678",
        )
        self.assertIsNone(user.email)
        self.assertFalse(user.has_usable_password())

    def test_user_requires_authentication_identity(self):
        with self.assertRaisesMessage(
            ValueError,
            "An email address or phone number is required.",
        ):
            User.objects.create_user()

    def test_create_superuser(self):
        user = User.objects.create_superuser(
            email="admin@example.com",
            password="StrongAdminPassword123!",
        )

        self.assertTrue(user.is_staff)
        self.assertTrue(user.is_superuser)
        self.assertTrue(user.is_active)
        self.assertTrue(user.is_email_verified)
