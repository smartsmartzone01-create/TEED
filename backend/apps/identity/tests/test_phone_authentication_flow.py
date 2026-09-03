from unittest.mock import patch

from django.core.cache import cache
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from ..models import PhoneVerificationChallenge, User
from ..sms import FakeSmsProvider


class PhoneAuthenticationFlowTests(APITestCase):
    password = "StrongPhonePassword123!"
    new_password = "NewPhonePassword456!"
    phone_number = "+255712345678"

    def setUp(self):
        cache.clear()

    def _post_with_fake_sms(self, url, payload, *, code):
        with patch(
            "apps.identity.services.phone_verification._generate_code",
            return_value=code,
        ), patch(
            "apps.identity.services.phone_verification.get_sms_provider",
            return_value=FakeSmsProvider(),
        ), self.captureOnCommitCallbacks(execute=True):
            return self.client.post(url, payload, format="json")

    def _register_and_verify(self):
        response = self._post_with_fake_sms(
            reverse("identity:phone-registration"),
            {
                "country_code": "TZ",
                "phone_number": "0712345678",
                "password": self.password,
            },
            code="483921",
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data["data"]["phone_number"], self.phone_number)
        self.assertEqual(response.data["data"]["next_step"], "verify_phone")

        user = User.objects.get(phone_number=self.phone_number)
        self.assertIsNone(user.email)
        self.assertFalse(user.is_phone_verified)
        challenge = PhoneVerificationChallenge.objects.get(
            user=user,
            purpose=PhoneVerificationChallenge.Purpose.REGISTRATION,
        )
        self.assertNotEqual(challenge.code_digest, "483921")

        response = self.client.post(
            reverse("identity:phone-verification"),
            {"phone_number": self.phone_number, "code": "483921"},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(response.data["data"]["is_phone_verified"])
        self.assertIsNone(response.data["data"]["email"])
        self.assertIn("access", response.data["data"]["tokens"])

        user.refresh_from_db()
        self.assertTrue(user.is_phone_verified)
        return user, response.data["data"]["tokens"]["access"]

    def test_phone_registration_verification_onboarding_and_login(self):
        user, access_token = self._register_and_verify()

        response = self.client.post(
            reverse("identity:onboarding"),
            {
                "username": "phoneowner",
                "country_code": "TZ",
                "phone_number": self.phone_number,
            },
            format="json",
            HTTP_AUTHORIZATION=f"Bearer {access_token}",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["data"]["phone_number"], self.phone_number)

        user.refresh_from_db()
        self.assertTrue(user.is_phone_verified)
        self.assertTrue(user.is_onboarding_complete)

        response = self.client.post(
            reverse("identity:phone-login"),
            {
                "country_code": "TZ",
                "phone_number": "0712345678",
                "password": self.password,
            },
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIsNone(response.data["data"]["email"])
        self.assertEqual(response.data["data"]["next_step"], "dashboard")

    def test_verified_phone_can_reset_password_with_sms_code(self):
        user, _ = self._register_and_verify()

        response = self._post_with_fake_sms(
            reverse("identity:password-reset-request"),
            {"identifier": self.phone_number},
            code="654321",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(
            response.data["message"],
            "If the account is eligible, a password reset code has been sent.",
        )
        challenge = PhoneVerificationChallenge.objects.filter(
            user=user,
            purpose=PhoneVerificationChallenge.Purpose.PASSWORD_RESET,
        ).get()
        self.assertNotEqual(challenge.code_digest, "654321")

        response = self.client.post(
            reverse("identity:password-reset-verify"),
            {"identifier": self.phone_number, "code": "654321"},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["data"]["next_step"], "choose_new_password")

        response = self.client.post(
            reverse("identity:password-reset-confirm"),
            {
                "new_password": self.new_password,
                "new_password_confirm": self.new_password,
            },
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        user.refresh_from_db()
        self.assertTrue(user.check_password(self.new_password))

        response = self.client.post(
            reverse("identity:phone-login"),
            {
                "country_code": "TZ",
                "phone_number": self.phone_number,
                "password": self.new_password,
            },
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_unknown_phone_reset_request_remains_non_enumerating(self):
        response = self.client.post(
            reverse("identity:password-reset-request"),
            {"identifier": "+255713333333"},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(
            response.data["message"],
            "If the account is eligible, a password reset code has been sent.",
        )
        self.assertFalse(
            PhoneVerificationChallenge.objects.filter(
                purpose=PhoneVerificationChallenge.Purpose.PASSWORD_RESET,
            ).exists()
        )
