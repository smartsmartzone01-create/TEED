from unittest.mock import patch

from django.core.cache import cache
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from ..throttles import LoginEmailThrottle, LoginIPThrottle


class EmailLoginThrottleTests(APITestCase):
    def setUp(self):
        cache.clear()
        self.url = reverse("identity:email-login")

    @patch.object(LoginIPThrottle, "rate", "2/minute", create=True)
    @patch.object(LoginEmailThrottle, "rate", "100/minute", create=True)
    def test_login_is_throttled_per_network(self):
        for attempt in range(3):
            response = self.client.post(
                self.url,
                {
                    "email": f"unknown-{attempt}@example.com",
                    "password": "WrongPassword123!",
                },
                format="json",
                REMOTE_ADDR="192.0.2.10",
            )

        self.assertEqual(
            response.status_code,
            status.HTTP_429_TOO_MANY_REQUESTS,
        )

    @patch.object(LoginIPThrottle, "rate", "100/minute", create=True)
    @patch.object(LoginEmailThrottle, "rate", "2/minute", create=True)
    def test_login_is_throttled_per_normalized_email(self):
        addresses = [
            "192.0.2.11",
            "192.0.2.12",
            "192.0.2.13",
        ]

        for attempt, address in enumerate(addresses):
            email = "TARGET@EXAMPLE.COM" if attempt % 2 == 0 else "target@example.com"
            response = self.client.post(
                self.url,
                {
                    "email": email,
                    "password": "WrongPassword123!",
                },
                format="json",
                REMOTE_ADDR=address,
            )

        self.assertEqual(
            response.status_code,
            status.HTTP_429_TOO_MANY_REQUESTS,
        )
