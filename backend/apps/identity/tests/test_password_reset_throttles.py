from unittest.mock import patch

from django.core.cache import cache
from django.test import TestCase
from django.urls import reverse
from rest_framework import status
from rest_framework.settings import api_settings
from rest_framework.test import APIClient


class PasswordResetThrottleTests(TestCase):
    def setUp(self):
        cache.clear()
        self.client = APIClient()

    def tearDown(self):
        cache.clear()

    @patch.dict(
        api_settings.DEFAULT_THROTTLE_RATES,
        {
            "password_reset_request_ip": "1/hour",
            "password_reset_request_account": "5/hour",
            "password_reset_verify_ip": "1/hour",
            "password_reset_verify_account": "5/hour",
            "password_reset_confirm_ip": "1/hour",
        },
    )
    def test_reset_stages_do_not_share_one_ip_budget(self):
        request_response = self.client.post(
            reverse("identity:password-reset-request"),
            {"email": "first@example.com"},
            format="json",
        )
        verify_response = self.client.post(
            reverse("identity:password-reset-verify"),
            {
                "email": "first@example.com",
                "code": "123456",
            },
            format="json",
        )
        confirm_response = self.client.post(
            reverse("identity:password-reset-confirm"),
            {
                "new_password": "New-Password-456!",
                "new_password_confirm": "New-Password-456!",
            },
            format="json",
        )

        self.assertEqual(
            request_response.status_code,
            status.HTTP_200_OK,
        )
        self.assertEqual(
            verify_response.status_code,
            status.HTTP_400_BAD_REQUEST,
        )
        self.assertEqual(
            confirm_response.status_code,
            status.HTTP_401_UNAUTHORIZED,
        )

    @patch.dict(
        api_settings.DEFAULT_THROTTLE_RATES,
        {
            "password_reset_request_ip": "10/hour",
            "password_reset_request_account": "1/hour",
        },
    )
    def test_request_account_limit_does_not_block_another_email(self):
        first = self.client.post(
            reverse("identity:password-reset-request"),
            {"email": "first@example.com"},
            format="json",
        )
        repeated = self.client.post(
            reverse("identity:password-reset-request"),
            {"email": "FIRST@example.com"},
            format="json",
        )
        other = self.client.post(
            reverse("identity:password-reset-request"),
            {"email": "other@example.com"},
            format="json",
        )

        self.assertEqual(first.status_code, status.HTTP_200_OK)
        self.assertEqual(
            repeated.status_code,
            status.HTTP_429_TOO_MANY_REQUESTS,
        )
        self.assertEqual(other.status_code, status.HTTP_200_OK)

    @patch.dict(
        api_settings.DEFAULT_THROTTLE_RATES,
        {
            "password_reset_request_ip": "2/hour",
            "password_reset_request_account": "5/hour",
        },
    )
    def test_request_ip_limit_spans_distinct_emails(self):
        responses = [
            self.client.post(
                reverse("identity:password-reset-request"),
                {"email": f"user{index}@example.com"},
                format="json",
            )
            for index in range(3)
        ]

        self.assertEqual(
            [response.status_code for response in responses],
            [
                status.HTTP_200_OK,
                status.HTTP_200_OK,
                status.HTTP_429_TOO_MANY_REQUESTS,
            ],
        )

    @patch.dict(
        api_settings.DEFAULT_THROTTLE_RATES,
        {
            "password_reset_verify_ip": "10/hour",
            "password_reset_verify_account": "1/hour",
        },
    )
    def test_verify_account_limit_is_independent(self):
        first = self.client.post(
            reverse("identity:password-reset-verify"),
            {
                "email": "first@example.com",
                "code": "123456",
            },
            format="json",
        )
        repeated = self.client.post(
            reverse("identity:password-reset-verify"),
            {
                "email": "first@example.com",
                "code": "123456",
            },
            format="json",
        )
        other = self.client.post(
            reverse("identity:password-reset-verify"),
            {
                "email": "other@example.com",
                "code": "123456",
            },
            format="json",
        )

        self.assertEqual(
            first.status_code,
            status.HTTP_400_BAD_REQUEST,
        )
        self.assertEqual(
            repeated.status_code,
            status.HTTP_429_TOO_MANY_REQUESTS,
        )
        self.assertEqual(
            other.status_code,
            status.HTTP_400_BAD_REQUEST,
        )

    @patch.dict(
        api_settings.DEFAULT_THROTTLE_RATES,
        {
            "password_reset_confirm_ip": "1/hour",
        },
    )
    def test_confirm_has_its_own_ip_limit(self):
        payload = {
            "new_password": "New-Password-456!",
            "new_password_confirm": "New-Password-456!",
        }

        first = self.client.post(
            reverse("identity:password-reset-confirm"),
            payload,
            format="json",
        )
        repeated = self.client.post(
            reverse("identity:password-reset-confirm"),
            payload,
            format="json",
        )

        self.assertEqual(
            first.status_code,
            status.HTTP_401_UNAUTHORIZED,
        )
        self.assertEqual(
            repeated.status_code,
            status.HTTP_429_TOO_MANY_REQUESTS,
        )
