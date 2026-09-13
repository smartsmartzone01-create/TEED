from unittest.mock import patch

from common.exceptions.modules.identity import (
    EmailAlreadyRegistered,
    InvalidCredentials,
)
from django.contrib.auth import get_user_model
from django.test import TestCase
from rest_framework_simplejwt.tokens import AccessToken

from apps.workspaces.models import Business

from ..models import StorefrontCustomer, StorefrontCustomerExternalIdentity
from ..services.storefront_customer_google_authentication import (
    authenticate_storefront_google_customer,
)
from ..services.storefront_customer_session import STOREFRONT_CUSTOMER_AUDIENCE

User = get_user_model()


class StorefrontCustomerGoogleAuthenticationTests(TestCase):
    def setUp(self):
        self.owner = User.objects.create_user(
            email="google-storefront-owner@example.com",
            password="StrongOwnerPassword123!",
        )
        self.business = Business.objects.create(
            name="Google Storefront",
            public_handle="google-storefront",
            created_by=self.owner,
        )
        self.other_business = Business.objects.create(
            name="Other Google Storefront",
            public_handle="other-google-storefront",
            created_by=self.owner,
        )
        self.claims = {
            "sub": "google-customer-subject",
            "email": "buyer@gmail.com",
            "email_verified": True,
            "given_name": "Asha",
            "family_name": "Mteja",
        }

    def authenticate(self, *, business=None, claims=None):
        with patch(
            "apps.identity.services.storefront_customer_google_authentication."
            "verify_google_credential",
            return_value=claims or self.claims,
        ):
            return authenticate_storefront_google_customer(
                business=business or self.business,
                credential="google-id-token",
                ip_address="127.0.0.1",
                user_agent="Mozilla/5.0 Chrome/120.0",
            )

    def test_google_creates_separate_customer_identity_and_session(self):
        result = self.authenticate()

        customer = result["customer"]
        self.assertEqual(customer.business_id, self.business.id)
        self.assertEqual(customer.email, "buyer@gmail.com")
        self.assertEqual(customer.first_name, "Asha")
        self.assertTrue(customer.is_email_verified)
        self.assertFalse(customer.has_usable_password())
        self.assertTrue(customer.is_identity_verified)
        self.assertTrue(
            StorefrontCustomerExternalIdentity.objects.filter(
                business=self.business,
                customer=customer,
                provider=StorefrontCustomerExternalIdentity.Provider.GOOGLE,
                subject="google-customer-subject",
            ).exists()
        )

        access = AccessToken(result["tokens"]["access"])
        self.assertEqual(access["aud"], STOREFRONT_CUSTOMER_AUDIENCE)
        self.assertEqual(access["business_id"], str(self.business.id))
        self.assertEqual(access["customer_id"], str(customer.id))
        self.assertNotIn("user_id", access.payload)

    def test_repeat_google_login_reuses_same_customer(self):
        first = self.authenticate()["customer"]
        second = self.authenticate()["customer"]

        self.assertEqual(first.id, second.id)
        self.assertEqual(StorefrontCustomer.objects.filter(business=self.business).count(), 1)
        self.assertEqual(
            StorefrontCustomerExternalIdentity.objects.filter(
                business=self.business,
            ).count(),
            1,
        )

    def test_same_google_subject_is_independent_between_businesses(self):
        first = self.authenticate(business=self.business)["customer"]
        second = self.authenticate(business=self.other_business)["customer"]

        self.assertNotEqual(first.id, second.id)
        self.assertEqual(
            StorefrontCustomerExternalIdentity.objects.filter(
                provider=StorefrontCustomerExternalIdentity.Provider.GOOGLE,
                subject="google-customer-subject",
            ).count(),
            2,
        )

    def test_authoritative_google_email_links_existing_customer_in_business(self):
        customer = StorefrontCustomer.objects.create(
            business=self.business,
            email="buyer@gmail.com",
            is_email_verified=False,
        )
        customer.set_password("ExistingCustomerPassword123!")
        customer.save(update_fields=["password", "updated_at"])

        result = self.authenticate()

        self.assertEqual(result["customer"].id, customer.id)
        customer.refresh_from_db()
        self.assertTrue(customer.is_email_verified)
        self.assertTrue(
            StorefrontCustomerExternalIdentity.objects.filter(customer=customer).exists()
        )

    def test_non_authoritative_google_email_does_not_link_existing_customer(self):
        customer = StorefrontCustomer.objects.create(
            business=self.business,
            email="buyer@example.com",
            is_email_verified=True,
        )
        customer.set_password("ExistingCustomerPassword123!")
        customer.save(update_fields=["password", "updated_at"])
        claims = {
            **self.claims,
            "email": "buyer@example.com",
            "hd": "",
        }

        with self.assertRaises(EmailAlreadyRegistered):
            self.authenticate(claims=claims)

    def test_google_login_rejects_inactive_linked_customer(self):
        customer = self.authenticate()["customer"]
        customer.is_active = False
        customer.save(update_fields=["is_active", "updated_at"])

        with self.assertRaises(InvalidCredentials):
            self.authenticate()
