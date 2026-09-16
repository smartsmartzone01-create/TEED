from datetime import timedelta
from unittest.mock import patch

from django.contrib.auth.hashers import check_password, make_password
from django.urls import reverse
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APITestCase

from apps.identity.models import (
    StorefrontCustomer,
    StorefrontCustomerSession,
    StorefrontCustomerVerificationChallenge,
)
from apps.workspaces.services import create_business
from apps.workspaces.tests.factories import create_user

from .models import WebsiteSite


class PublicStorefrontPasswordResetTests(APITestCase):
    password = "StrongCustomerPassword123!"

    def setUp(self):
        self.owner = create_user("storefront-reset-owner@example.com")
        self.business = create_business(user=self.owner, name="Storefront Reset")
        self.site = WebsiteSite.objects.create(
            business=self.business,
            slug="storefront-reset",
            display_name="Storefront Reset",
            is_published=True,
        )
        self.customer = StorefrontCustomer.objects.create(
            business=self.business,
            email="buyer@example.com",
            is_email_verified=True,
        )
        self.customer.set_password(self.password)
        self.customer.save(update_fields=["password", "updated_at"])

    def url(self, name):
        return reverse(
            f"website-public:{name}",
            kwargs={"site_key": self.site.public_key},
        )

    @patch(
        "apps.identity.services.storefront_customer_registration._deliver_email_code"
    )
    def test_reset_request_is_neutral_and_creates_password_reset_challenge(
        self,
        deliver_email_code,
    ):
        response = self.client.post(
            self.url("auth-password-reset-request"),
            {"channel": "email", "email": self.customer.email},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["data"]["next_step"], "verify_reset_code")
        self.assertTrue(
            StorefrontCustomerVerificationChallenge.objects.filter(
                customer=self.customer,
                purpose=StorefrontCustomerVerificationChallenge.Purpose.PASSWORD_RESET,
            ).exists()
        )
        self.assertEqual(response["Cache-Control"], "no-store")

        unknown_response = self.client.post(
            self.url("auth-password-reset-request"),
            {"channel": "email", "email": "unknown@example.com"},
            format="json",
        )
        self.assertEqual(unknown_response.status_code, status.HTTP_200_OK)
        self.assertEqual(unknown_response.data["message"], response.data["message"])

    def test_verify_and_confirm_reset_changes_password_and_revokes_sessions(self):
        session = StorefrontCustomerSession.objects.create(
            customer=self.customer,
            expires_at=timezone.now() + timedelta(days=1),
        )
        StorefrontCustomerVerificationChallenge.objects.create(
            customer=self.customer,
            channel=StorefrontCustomerVerificationChallenge.Channel.EMAIL,
            purpose=StorefrontCustomerVerificationChallenge.Purpose.PASSWORD_RESET,
            destination=self.customer.email,
            code_digest=make_password("123456"),
            expires_at=timezone.now() + timedelta(minutes=10),
        )

        verify_response = self.client.post(
            self.url("auth-password-reset-verify"),
            {
                "channel": "email",
                "email": self.customer.email,
                "code": "123456",
            },
            format="json",
        )

        self.assertEqual(verify_response.status_code, status.HTTP_200_OK)
        grant = verify_response.data["data"]["reset_grant"]
        self.assertTrue(grant)
        self.assertGreater(
            verify_response.data["data"]["reset_grant_expires_in"],
            0,
        )

        new_password = "NewStrongCustomerPassword456!"
        confirm_response = self.client.post(
            self.url("auth-password-reset-confirm"),
            {
                "reset_grant": grant,
                "new_password": new_password,
                "new_password_confirm": new_password,
            },
            format="json",
        )

        self.assertEqual(confirm_response.status_code, status.HTTP_200_OK)
        self.assertEqual(confirm_response.data["data"]["next_step"], "sign_in")
        self.customer.refresh_from_db()
        self.assertTrue(check_password(new_password, self.customer.password))
        session.refresh_from_db()
        self.assertIsNotNone(session.revoked_at)
        self.assertEqual(
            session.revoke_reason,
            StorefrontCustomerSession.RevokeReason.PASSWORD_RESET,
        )

    def test_phone_reset_request_normalizes_local_number(self):
        customer = StorefrontCustomer.objects.create(
            business=self.business,
            phone_number="+255712345678",
            is_phone_verified=True,
        )
        customer.set_password(self.password)
        customer.save(update_fields=["password", "updated_at"])

        with patch(
            "apps.identity.services.storefront_customer_registration._deliver_phone_code"
        ):
            response = self.client.post(
                self.url("auth-password-reset-request"),
                {
                    "channel": "phone",
                    "country_code": "TZ",
                    "phone_number": "0712345678",
                },
                format="json",
            )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(
            StorefrontCustomerVerificationChallenge.objects.filter(
                customer=customer,
                purpose=StorefrontCustomerVerificationChallenge.Purpose.PASSWORD_RESET,
                destination="+255712345678",
            ).exists()
        )
