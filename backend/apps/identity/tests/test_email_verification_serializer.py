from django.test import SimpleTestCase

from ..serializers import (
    EmailVerificationResendSerializer,
    EmailVerificationSerializer,
)


class EmailVerificationSerializerTests(
    SimpleTestCase
):
    def test_valid_verification_data(self):
        serializer = EmailVerificationSerializer(
            data={
                "email": "USER@Example.COM",
                "code": "123456",
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
            serializer.validated_data["code"],
            "123456",
        )

    def test_non_numeric_code_is_rejected(self):
        serializer = EmailVerificationSerializer(
            data={
                "email": "user@example.com",
                "code": "12AB56",
            }
        )

        self.assertFalse(serializer.is_valid())
        self.assertIn(
            "code",
            serializer.errors,
        )

    def test_wrong_length_code_is_rejected(self):
        serializer = EmailVerificationSerializer(
            data={
                "email": "user@example.com",
                "code": "12345",
            }
        )

        self.assertFalse(serializer.is_valid())
        self.assertIn(
            "code",
            serializer.errors,
        )

    def test_resend_email_is_normalized(self):
        serializer = (
            EmailVerificationResendSerializer(
                data={
                    "email": "USER@Example.COM",
                }
            )
        )

        self.assertTrue(
            serializer.is_valid(),
            serializer.errors,
        )
        self.assertEqual(
            serializer.validated_data["email"],
            "user@example.com",
        )