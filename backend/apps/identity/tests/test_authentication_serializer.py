from django.test import SimpleTestCase

from ..serializers import EmailLoginSerializer


class EmailLoginSerializerTests(SimpleTestCase):
    def test_valid_login_data_is_normalized(self):
        serializer = EmailLoginSerializer(
            data={
                "email": "  USER@Example.COM  ",
                "password": "  StrongTestPassword123!  ",
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
            "  StrongTestPassword123!  ",
        )

    def test_invalid_email_is_rejected(self):
        serializer = EmailLoginSerializer(
            data={
                "email": "not-an-email",
                "password": "StrongTestPassword123!",
            }
        )

        self.assertFalse(serializer.is_valid())
        self.assertIn(
            "email",
            serializer.errors,
        )

    def test_required_fields_are_enforced(self):
        serializer = EmailLoginSerializer(data={})

        self.assertFalse(serializer.is_valid())
        self.assertIn(
            "email",
            serializer.errors,
        )
        self.assertIn(
            "password",
            serializer.errors,
        )
