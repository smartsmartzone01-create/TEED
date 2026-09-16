from datetime import timedelta

from django.contrib.auth.hashers import make_password
from django.urls import reverse
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APITestCase
from rest_framework_simplejwt.tokens import AccessToken

from apps.identity.models import (
    StorefrontCustomer,
    StorefrontCustomerSession,
    StorefrontCustomerVerificationChallenge,
)
from apps.identity.services import STOREFRONT_CUSTOMER_AUDIENCE
from apps.workspaces.services import create_business
from apps.workspaces.tests.factories import create_user

from .models import WebsiteSite


class PublicStorefrontCustomerAuthTests(APITestCase):
    password = "StrongCustomerPassword123!"

    def setUp(self):
        self.owner = create_user("storefront-auth-owner@example.com")
        self.business = create_business(user=self.owner, name="Storefront Auth")
        self.site = WebsiteSite.objects.create(
            business=self.business,
            slug="storefront-auth",
            display_name="Storefront Auth",
            is_published=True,
        )
        self.other_business = create_business(
            user=self.owner,
            name="Other Storefront Auth",
        )
        self.other_site = WebsiteSite.objects.create(
            business=self.other_business,
            slug="other-storefront-auth",
            display_name="Other Storefront Auth",
            is_published=True,
        )

    def url(self, name, *, site=None):
        return reverse(
            f"website-public:{name}",
            kwargs={"site_key": (site or self.site).public_key},
        )

    def create_customer(
        self,
        *,
        business=None,
        email=None,
        phone_number=None,
        email_verified=False,
        phone_verified=False,
    ):
        customer = StorefrontCustomer.objects.create(
            business=business or self.business,
            email=email,
            phone_number=phone_number,
            is_email_verified=email_verified,
            is_phone_verified=phone_verified,
        )
        customer.set_password(self.password)
        customer.save(update_fields=["password", "updated_at"])
        return customer

    def test_email_registration_creates_customer_for_storefront_business(self):
        response = self.client.post(
            self.url("auth-register-email"),
            {
                "email": " Buyer@Example.com ",
                "password": self.password,
                "first_name": "Asha",
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        customer = StorefrontCustomer.objects.get(
            business=self.business,
            email="buyer@example.com",
        )
        self.assertEqual(customer.first_name, "Asha")
        self.assertFalse(customer.is_email_verified)
        self.assertTrue(
            StorefrontCustomerVerificationChallenge.objects.filter(
                customer=customer,
                channel=StorefrontCustomerVerificationChallenge.Channel.EMAIL,
            ).exists()
        )
        self.assertEqual(response.data["data"]["next_step"], "verify_email")
        self.assertEqual(response["Cache-Control"], "no-store")

    def test_phone_registration_normalizes_number_and_creates_challenge(self):
        response = self.client.post(
            self.url("auth-register-phone"),
            {
                "country_code": "TZ",
                "phone_number": "0712345678",
                "password": self.password,
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        customer = StorefrontCustomer.objects.get(
            business=self.business,
            phone_number="+255712345678",
        )
        self.assertTrue(
            StorefrontCustomerVerificationChallenge.objects.filter(
                customer=customer,
                channel=StorefrontCustomerVerificationChallenge.Channel.PHONE,
            ).exists()
        )
        self.assertEqual(response.data["data"]["next_step"], "verify_phone")

    def test_email_verification_signs_customer_in_with_customer_audience(self):
        customer = self.create_customer(email="verify@example.com")
        StorefrontCustomerVerificationChallenge.objects.create(
            customer=customer,
            channel=StorefrontCustomerVerificationChallenge.Channel.EMAIL,
            destination=customer.email,
            code_digest=make_password("123456"),
            expires_at=timezone.now() + timedelta(minutes=10),
        )

        response = self.client.post(
            self.url("auth-verify-email"),
            {"email": customer.email, "code": "123456"},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        customer.refresh_from_db()
        self.assertTrue(customer.is_email_verified)
        tokens = response.data["data"]["tokens"]
        access = AccessToken(tokens["access"])
        self.assertEqual(access["aud"], STOREFRONT_CUSTOMER_AUDIENCE)
        self.assertEqual(access["business_id"], str(self.business.id))
        self.assertEqual(access["customer_id"], str(customer.id))
        self.assertNotIn("user_id", access.payload)
        self.assertTrue(tokens["refresh"])

    def test_phone_verification_signs_customer_in(self):
        customer = self.create_customer(phone_number="+255713456789")
        StorefrontCustomerVerificationChallenge.objects.create(
            customer=customer,
            channel=StorefrontCustomerVerificationChallenge.Channel.PHONE,
            destination=customer.phone_number,
            code_digest=make_password("654321"),
            expires_at=timezone.now() + timedelta(minutes=10),
        )

        response = self.client.post(
            self.url("auth-verify-phone"),
            {
                "country_code": "TZ",
                "phone_number": "0713456789",
                "code": "654321",
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        customer.refresh_from_db()
        self.assertTrue(customer.is_phone_verified)
        self.assertEqual(
            response.data["data"]["customer"]["phone_number"],
            "+255713456789",
        )

    def test_email_login_and_current_customer_are_site_scoped(self):
        customer = self.create_customer(
            email="login@example.com",
            email_verified=True,
        )

        login_response = self.client.post(
            self.url("auth-login-email"),
            {"email": customer.email, "password": self.password},
            format="json",
        )

        self.assertEqual(login_response.status_code, status.HTTP_200_OK)
        access = login_response.data["data"]["tokens"]["access"]
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {access}")

        me_response = self.client.get(self.url("auth-me"))
        self.assertEqual(me_response.status_code, status.HTTP_200_OK)
        self.assertEqual(me_response.data["data"]["customer"]["id"], str(customer.id))

        wrong_site_response = self.client.get(
            self.url("auth-me", site=self.other_site),
        )
        self.assertEqual(wrong_site_response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_refresh_rotates_session_and_logout_invalidates_access(self):
        customer = self.create_customer(
            email="session@example.com",
            email_verified=True,
        )
        login_response = self.client.post(
            self.url("auth-login-email"),
            {"email": customer.email, "password": self.password},
            format="json",
        )
        original_tokens = login_response.data["data"]["tokens"]

        refresh_response = self.client.post(
            self.url("auth-session-refresh"),
            {"refresh": original_tokens["refresh"]},
            format="json",
        )

        self.assertEqual(refresh_response.status_code, status.HTTP_200_OK)
        rotated_tokens = refresh_response.data["data"]["tokens"]
        self.assertNotEqual(rotated_tokens["refresh"], original_tokens["refresh"])
        self.assertEqual(
            rotated_tokens["session_id"],
            original_tokens["session_id"],
        )

        logout_response = self.client.post(
            self.url("auth-session-logout"),
            {"refresh": rotated_tokens["refresh"]},
            format="json",
        )
        self.assertEqual(logout_response.status_code, status.HTTP_200_OK)

        session = StorefrontCustomerSession.objects.get(
            id=rotated_tokens["session_id"],
        )
        self.assertIsNotNone(session.revoked_at)

        self.client.credentials(
            HTTP_AUTHORIZATION=f"Bearer {rotated_tokens['access']}"
        )
        me_response = self.client.get(self.url("auth-me"))
        self.assertEqual(me_response.status_code, status.HTTP_401_UNAUTHORIZED)
