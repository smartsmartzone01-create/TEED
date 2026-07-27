from django.contrib.auth import get_user_model
from django.test import TestCase
from django.utils import timezone

from common.exceptions.modules.identity import (
    IdentityVerificationRequired,
    OnboardingAlreadyCompleted,
    PhoneNumberAlreadyRegistered,
    UsernameAlreadyTaken,
)

from ..services import complete_onboarding


User = get_user_model()


class OnboardingServiceTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            email="onboarding@example.com",
            password="StrongTestPassword123!",
            is_email_verified=True,
        )

    def test_complete_onboarding(self):
        user = complete_onboarding(
            user=self.user,
            username="teedmember",
            phone_number="+255712345678",
            country_code="TZ",
        )

        self.assertEqual(
            user.username,
            "teedmember",
        )
        self.assertEqual(
            user.phone_number,
            "+255712345678",
        )
        self.assertEqual(
            user.country_code,
            "TZ",
        )
        self.assertTrue(
            user.is_onboarding_complete
        )
        self.assertIsNotNone(
            user.onboarding_completed_at
        )

    def test_verified_identity_is_required(self):
        self.user.is_email_verified = False
        self.user.save(
            update_fields=[
                "is_email_verified",
                "updated_at",
            ]
        )

        with self.assertRaises(
            IdentityVerificationRequired
        ):
            complete_onboarding(
                user=self.user,
                username="teedmember",
                phone_number="+255712345678",
                country_code="TZ",
            )

    def test_duplicate_username_is_rejected(self):
        User.objects.create_user(
            email="existing@example.com",
            username="TeedMember",
            password="StrongTestPassword123!",
        )

        with self.assertRaises(
            UsernameAlreadyTaken
        ):
            complete_onboarding(
                user=self.user,
                username="teedmember",
                phone_number="+255712345678",
                country_code="TZ",
            )

    def test_duplicate_phone_is_rejected(self):
        User.objects.create_user(
            email="existing@example.com",
            phone_number="+255712345678",
            password="StrongTestPassword123!",
        )

        with self.assertRaises(
            PhoneNumberAlreadyRegistered
        ):
            complete_onboarding(
                user=self.user,
                username="teedmember",
                phone_number="+255712345678",
                country_code="TZ",
            )

    def test_onboarding_cannot_be_completed_twice(
        self,
    ):
        self.user.username = "existingmember"
        self.user.phone_number = "+255712345678"
        self.user.country_code = "TZ"
        self.user.onboarding_completed_at = (
            timezone.now()
        )
        self.user.save(
            update_fields=[
                "username",
                "phone_number",
                "country_code",
                "onboarding_completed_at",
                "updated_at",
            ]
        )

        with self.assertRaises(
            OnboardingAlreadyCompleted
        ):
            complete_onboarding(
                user=self.user,
                username="newmember",
                phone_number="+255713456789",
                country_code="TZ",
            )