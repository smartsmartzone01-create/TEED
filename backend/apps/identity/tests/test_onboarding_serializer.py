from django.test import SimpleTestCase

from ..serializers import OnboardingSerializer


class OnboardingSerializerTests(SimpleTestCase):
    def test_local_numbers_for_supported_countries(
        self,
    ):
        cases = [
            ("TZ", "0712345678", "+255712345678"),
            ("KE", "0712345678", "+254712345678"),
            ("UG", "0712345678", "+256712345678"),
        ]

        for country, phone, expected in cases:
            with self.subTest(country=country):
                serializer = OnboardingSerializer(
                    data={
                        "username": "TeedMember",
                        "country_code": country,
                        "phone_number": phone,
                    }
                )

                self.assertTrue(
                    serializer.is_valid(),
                    serializer.errors,
                )
                self.assertEqual(
                    serializer.validated_data["phone_number"],
                    expected,
                )

    def test_supported_tanzanian_formats(self):
        numbers = [
            "0712345678",
            "712345678",
            "255712345678",
            "+255712345678",
            "+255 712 345 678",
        ]

        for phone_number in numbers:
            with self.subTest(phone_number=phone_number):
                serializer = OnboardingSerializer(
                    data={
                        "username": "teedmember",
                        "country_code": "TZ",
                        "phone_number": phone_number,
                    }
                )

                self.assertTrue(
                    serializer.is_valid(),
                    serializer.errors,
                )
                self.assertEqual(
                    serializer.validated_data["phone_number"],
                    "+255712345678",
                )

    def test_country_and_number_must_match(self):
        serializer = OnboardingSerializer(
            data={
                "username": "teedmember",
                "country_code": "TZ",
                "phone_number": "+254712345678",
            }
        )

        self.assertFalse(serializer.is_valid())
        self.assertIn(
            "phone_number",
            serializer.errors,
        )

    def test_unsupported_country_is_rejected(self):
        serializer = OnboardingSerializer(
            data={
                "username": "teedmember",
                "country_code": "RW",
                "phone_number": "0712345678",
            }
        )

        self.assertFalse(serializer.is_valid())
        self.assertIn(
            "country_code",
            serializer.errors,
        )

    def test_username_is_normalized(self):
        serializer = OnboardingSerializer(
            data={
                "username": "Teed_Member",
                "country_code": "KE",
                "phone_number": "0712345678",
            }
        )

        self.assertTrue(
            serializer.is_valid(),
            serializer.errors,
        )
        self.assertEqual(
            serializer.validated_data["username"],
            "teed_member",
        )
