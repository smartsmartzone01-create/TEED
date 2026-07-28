from unittest.mock import patch

from common.exceptions.modules.identity import (
    EmailAlreadyRegistered,
)
from django.contrib.auth import get_user_model
from django.core.cache import cache
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

User = get_user_model()


class EmailRegistrationAPITests(APITestCase):
    def setUp(self):
        cache.clear()
        self.url = reverse("identity:email-registration")

    @patch(
        "apps.identity.services.email_verification._generate_verification_code",
        return_value="123456",
    )
    def test_register_email_user(self, generate_code):
        response = self.client.post(
            self.url,
            {
                "email": "USER@Example.COM",
                "password": ("StrongTestPassword123!"),
            },
            format="json",
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_201_CREATED,
        )
        self.assertTrue(response.data["success"])
        self.assertEqual(
            response.data["data"]["email"],
            "user@example.com",
        )
        self.assertEqual(
            response.data["data"]["next_step"],
            "verify_email",
        )
        self.assertNotIn(
            "password",
            response.data["data"],
        )
        self.assertNotIn(
            "code",
            response.data["data"],
        )
        self.assertTrue(
            User.objects.filter(
                email="user@example.com",
            ).exists()
        )

    def test_invalid_registration_data(self):
        response = self.client.post(
            self.url,
            {
                "email": "not-an-email",
                "password": "123",
            },
            format="json",
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_400_BAD_REQUEST,
        )
        self.assertFalse(response.data["success"])
        self.assertIn(
            "email",
            response.data["errors"],
        )
        self.assertIn(
            "password",
            response.data["errors"],
        )

    def test_duplicate_email_uses_teed_error(
        self,
    ):
        User.objects.create_user(
            email="member@example.com",
            password="StrongTestPassword123!",
        )

        response = self.client.post(
            self.url,
            {
                "email": "MEMBER@EXAMPLE.COM",
                "password": ("AnotherStrongPassword123!"),
            },
            format="json",
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_409_CONFLICT,
        )
        self.assertFalse(response.data["success"])
        self.assertEqual(
            response.data["errors"]["code"],
            EmailAlreadyRegistered.default_code,
        )
