from unittest.mock import patch

from django.core.cache import cache
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from ..throttles import (
    EmailRegistrationIPThrottle,
    EmailVerificationResendAccountThrottle,
    EmailVerificationResendIPThrottle,
)


class EmailVerificationResendThrottleTests(APITestCase):
    def setUp(self):
        cache.clear()
        self.url = reverse("identity:email-verification-resend")

    @patch.object(
        EmailVerificationResendIPThrottle,
        "rate",
        "2/hour",
        create=True,
    )
    @patch.object(
        EmailVerificationResendAccountThrottle,
        "rate",
        "100/hour",
        create=True,
    )
    def test_resend_is_throttled_per_network(self):
        for attempt in range(3):
            response = self.client.post(
                self.url,
                {
                    "email": f"unknown-{attempt}@example.com",
                },
                format="json",
                REMOTE_ADDR="192.0.2.50",
            )

        self.assertEqual(
            response.status_code,
            status.HTTP_429_TOO_MANY_REQUESTS,
        )

    @patch.object(
        EmailVerificationResendIPThrottle,
        "rate",
        "100/hour",
        create=True,
    )
    @patch.object(
        EmailVerificationResendAccountThrottle,
        "rate",
        "2/hour",
        create=True,
    )
    def test_resend_is_throttled_per_normalized_email(self):
        for attempt, address in enumerate(
            [
                "192.0.2.51",
                "192.0.2.52",
                "192.0.2.53",
            ]
        ):
            email = "TARGET@EXAMPLE.COM" if attempt % 2 == 0 else "target@example.com"
            response = self.client.post(
                self.url,
                {"email": email},
                format="json",
                REMOTE_ADDR=address,
            )

        self.assertEqual(
            response.status_code,
            status.HTTP_429_TOO_MANY_REQUESTS,
        )


class EmailRegistrationThrottleTests(APITestCase):
    def setUp(self):
        cache.clear()
        self.url = reverse("identity:email-registration")

    @patch.object(
        EmailRegistrationIPThrottle,
        "rate",
        "2/hour",
        create=True,
    )
    def test_registration_email_delivery_is_throttled_per_network(self):
        for attempt in range(3):
            response = self.client.post(
                self.url,
                {
                    "email": f"new-{attempt}@example.com",
                    "password": "StrongTestPassword123!",
                },
                format="json",
                REMOTE_ADDR="192.0.2.60",
            )

        self.assertEqual(
            response.status_code,
            status.HTTP_429_TOO_MANY_REQUESTS,
        )
