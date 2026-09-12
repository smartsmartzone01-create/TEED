from datetime import timedelta

from django.conf import settings
from django.contrib.auth import get_user_model
from django.test import TestCase
from django.utils import timezone

from ..models import (
    StorefrontCustomer,
    StorefrontCustomerSession,
    StorefrontCustomerVerificationChallenge,
)

User = get_user_model()


class StorefrontCustomerModelTests(TestCase):
    def setUp(self):
        self.customer = StorefrontCustomer.objects.create(
            email="customer@example.com",
        )
        self.customer.set_password("StrongCustomerPassword123!")
        self.customer.save(update_fields=["password", "updated_at"])

    def test_customer_identity_is_separate_from_workspace_user(self):
        user = User.objects.create_user(
            email="customer@example.com",
            password="StrongWorkspacePassword123!",
        )

        self.assertNotEqual(
            StorefrontCustomer._meta.label_lower,
            settings.AUTH_USER_MODEL.lower(),
        )
        self.assertNotEqual(user._meta.label_lower, self.customer._meta.label_lower)

    def test_customer_password_uses_django_password_hashing(self):
        self.assertNotEqual(
            self.customer.password,
            "StrongCustomerPassword123!",
        )
        self.assertTrue(
            self.customer.check_password("StrongCustomerPassword123!"),
        )

    def test_customer_is_verified_when_either_channel_is_verified(self):
        self.assertFalse(self.customer.is_identity_verified)

        self.customer.is_phone_verified = True

        self.assertTrue(self.customer.is_identity_verified)

    def test_verification_challenge_never_has_raw_code_field(self):
        challenge = StorefrontCustomerVerificationChallenge.objects.create(
            customer=self.customer,
            channel=StorefrontCustomerVerificationChallenge.Channel.EMAIL,
            destination=self.customer.email,
            code_digest="hashed-code-only",
            expires_at=timezone.now() + timedelta(minutes=10),
        )

        field_names = {
            field.name
            for field in StorefrontCustomerVerificationChallenge._meta.fields
        }
        self.assertNotIn("code", field_names)
        self.assertTrue(challenge.can_attempt)

    def test_customer_session_has_independent_server_side_authority(self):
        session = StorefrontCustomerSession.objects.create(
            customer=self.customer,
            expires_at=timezone.now() + timedelta(days=1),
        )

        self.assertTrue(session.is_active)
        self.assertEqual(session.customer_id, self.customer.id)
