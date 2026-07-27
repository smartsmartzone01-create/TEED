from django.test import SimpleTestCase

from ..serializers import (
    EmailRegistrationSerializer,
)


class EmailRegistrationSerializerTests(
    SimpleTestCase
):
    def test_valid_registration_data(self):
        serializer = EmailRegistrationSerializer(
            data={
                "email": "USER@Example.COM",
                "password": (
                    "StrongTestPassword123!"
                ),
            }
        )

        self.assertTrue(
            serializer.is_valid(),
            serializer.errors,
        )
        self.assertEqual(
            serializer.validated_data["email"],
            "user@example.com",
        )
        self.assertEqual(
            serializer.validated_data["password"],
            "StrongTestPassword123!",
        )

    def test_invalid_email_is_rejected(self):
        serializer = EmailRegistrationSerializer(
            data={
                "email": "not-an-email",
                "password": (
                    "StrongTestPassword123!"
                ),
            }
        )

        self.assertFalse(serializer.is_valid())
        self.assertIn(
            "email",
            serializer.errors,
        )

    def test_weak_password_is_rejected(self):
        serializer = EmailRegistrationSerializer(
            data={
                "email": "user@example.com",
                "password": "123",
            }
        )

        self.assertFalse(serializer.is_valid())
        self.assertIn(
            "password",
            serializer.errors,
        )