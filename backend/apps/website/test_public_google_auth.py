from unittest.mock import patch

from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase
from rest_framework_simplejwt.tokens import AccessToken

from apps.identity.models import (
    StorefrontCustomer,
    StorefrontCustomerExternalIdentity,
)
from apps.identity.services import STOREFRONT_CUSTOMER_AUDIENCE
from apps.workspaces.services import create_business
from apps.workspaces.tests.factories import create_user

from .models import WebsiteSite


class PublicStorefrontGoogleAuthTests(APITestCase):
    def setUp(self):
        self.owner = create_user("public-google-owner@example.com")
        self.business = create_business(user=self.owner, name="Public Google Store")
        self.site = WebsiteSite.objects.create(
            business=self.business,
            slug="public-google-store",
            display_name="Public Google Store",
            is_published=True,
        )
        self.other_business = create_business(
            user=self.owner,
            name="Other Public Google Store",
        )
        self.other_site = WebsiteSite.objects.create(
            business=self.other_business,
            slug="other-public-google-store",
            display_name="Other Public Google Store",
            is_published=True,
        )
        self.claims = {
            "sub": "public-google-subject",
            "email": "public-buyer@gmail.com",
            "email_verified": True,
            "given_name": "Amina",
            "family_name": "Buyer",
        }

    def url(self, name, *, site=None):
        return reverse(
            f"website-public:{name}",
            kwargs={"site_key": (site or self.site).public_key},
        )

    @patch("apps.website.public_auth_api.get_google_client_id")
    def test_google_config_returns_public_client_id(self, get_client_id):
        get_client_id.return_value = "google-client.apps.googleusercontent.com"

        response = self.client.get(self.url("auth-google-config"))

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(response.data["data"]["enabled"])
        self.assertEqual(
            response.data["data"]["client_id"],
            "google-client.apps.googleusercontent.com",
        )
        self.assertEqual(response["Cache-Control"], "no-store")

    @patch(
        "apps.identity.services.storefront_customer_google_authentication."
        "verify_google_credential"
    )
    def test_google_login_creates_site_scoped_customer_session(self, verify_credential):
        verify_credential.return_value = self.claims

        response = self.client.post(
            self.url("auth-login-google"),
            {"credential": "google-id-token"},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        customer = StorefrontCustomer.objects.get(
            business=self.business,
            email="public-buyer@gmail.com",
        )
        self.assertTrue(
            StorefrontCustomerExternalIdentity.objects.filter(
                business=self.business,
                customer=customer,
                subject="public-google-subject",
            ).exists()
        )
        tokens = response.data["data"]["tokens"]
        access = AccessToken(tokens["access"])
        self.assertEqual(access["aud"], STOREFRONT_CUSTOMER_AUDIENCE)
        self.assertEqual(access["business_id"], str(self.business.id))
        self.assertNotIn("user_id", access.payload)

    @patch(
        "apps.identity.services.storefront_customer_google_authentication."
        "verify_google_credential"
    )
    def test_same_google_account_is_separate_between_storefront_businesses(
        self,
        verify_credential,
    ):
        verify_credential.return_value = self.claims

        first = self.client.post(
            self.url("auth-login-google"),
            {"credential": "google-id-token"},
            format="json",
        )
        second = self.client.post(
            self.url("auth-login-google", site=self.other_site),
            {"credential": "google-id-token"},
            format="json",
        )

        self.assertEqual(first.status_code, status.HTTP_200_OK)
        self.assertEqual(second.status_code, status.HTTP_200_OK)
        self.assertEqual(
            StorefrontCustomer.objects.filter(email="public-buyer@gmail.com").count(),
            2,
        )
        self.assertNotEqual(
            first.data["data"]["customer"]["id"],
            second.data["data"]["customer"]["id"],
        )
