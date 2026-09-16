from datetime import timedelta

from common.exceptions.modules.identity import (
    PasswordResetChallengeInvalid,
    PasswordResetPasswordUnchanged,
)
from django.contrib.auth import get_user_model
from django.contrib.auth.hashers import make_password
from django.test import TestCase
from django.utils import timezone

from apps.workspaces.models import Business

from ..models import (
    StorefrontCustomer,
    StorefrontCustomerPasswordResetGrant,
    StorefrontCustomerSession,
    StorefrontCustomerVerificationChallenge,
)
from ..services.storefront_customer_password_reset import (
    confirm_storefront_customer_password_reset,
    request_storefront_customer_password_reset,
    verify_storefront_customer_password_reset_code,
)
from ..services.storefront_customer_session import issue_storefront_customer_token_pair

User = get_user_model()


class StorefrontCustomerPasswordResetServiceTests(TestCase):
    def setUp(self):
        self.owner = User.objects.create_user(
            email="reset-owner@example.com",
            password="StrongOwnerPassword123!",
        )
        self.business = Business.objects.create(
            name="Reset Storefront",
            public_handle="reset-storefront",
            created_by=self.owner,
        )
        self.other_business = Business.objects.create(
            name="Other Reset Storefront",
            public_handle="other-reset-storefront",
            created_by=self.owner,
        )
        self.customer = StorefrontCustomer.objects.create(
            business=self.business,
            email="buyer@example.com",
            phone_number="+255712345678",
            is_email_verified=True,
            is_phone_verified=True,
        )
        self.customer.set_password("OldCustomerPassword123!")
        self.customer.save(update_fields=["password", "updated_at"])

    def create_reset_challenge(self, *, code="123456"):
        return StorefrontCustomerVerificationChallenge.objects.create(
            customer=self.customer,
            channel=StorefrontCustomerVerificationChallenge.Channel.EMAIL,
            purpose=StorefrontCustomerVerificationChallenge.Purpose.PASSWORD_RESET,
            destination=self.customer.email,
            code_digest=make_password(code),
            expires_at=timezone.now() + timedelta(minutes=10),
            max_attempts=5,
        )

    def test_request_reset_creates_password_reset_challenge_for_verified_customer(self):
        request_storefront_customer_password_reset(
            business=self.business,
            identifier=" BUYER@example.com ",
        )

        challenge = StorefrontCustomerVerificationChallenge.objects.get(
            customer=self.customer,
            purpose=StorefrontCustomerVerificationChallenge.Purpose.PASSWORD_RESET,
        )
        self.assertEqual(
            challenge.channel,
            StorefrontCustomerVerificationChallenge.Channel.EMAIL,
        )
        self.assertEqual(challenge.destination, self.customer.email)
        self.assertNotEqual(challenge.code_digest, "")

    def test_request_reset_is_neutral_for_unknown_or_unverified_customer(self):
        request_storefront_customer_password_reset(
            business=self.business,
            identifier="missing@example.com",
        )

        unverified = StorefrontCustomer.objects.create(
            business=self.business,
            email="unverified@example.com",
            is_email_verified=False,
        )
        unverified.set_password("AnotherCustomerPassword123!")
        unverified.save(update_fields=["password", "updated_at"])
        request_storefront_customer_password_reset(
            business=self.business,
            identifier=unverified.email,
        )

        self.assertEqual(
            StorefrontCustomerVerificationChallenge.objects.filter(
                purpose=StorefrontCustomerVerificationChallenge.Purpose.PASSWORD_RESET,
            ).count(),
            0,
        )

    def test_verify_reset_code_creates_hashed_single_use_grant(self):
        challenge = self.create_reset_challenge()

        raw_grant, expires_at = verify_storefront_customer_password_reset_code(
            business=self.business,
            identifier=self.customer.email,
            code="123456",
        )

        challenge.refresh_from_db()
        grant = StorefrontCustomerPasswordResetGrant.objects.get(customer=self.customer)
        self.assertIsNotNone(challenge.consumed_at)
        self.assertTrue(raw_grant)
        self.assertNotEqual(grant.token_digest, raw_grant)
        self.assertEqual(grant.expires_at, expires_at)
        self.assertEqual(grant.challenge_id, challenge.id)

    def test_invalid_reset_code_increments_attempt_count(self):
        challenge = self.create_reset_challenge()

        with self.assertRaises(PasswordResetChallengeInvalid):
            verify_storefront_customer_password_reset_code(
                business=self.business,
                identifier=self.customer.email,
                code="000000",
            )

        challenge.refresh_from_db()
        self.assertEqual(challenge.attempt_count, 1)
        self.assertEqual(StorefrontCustomerPasswordResetGrant.objects.count(), 0)

    def test_reset_verification_is_scoped_to_business(self):
        self.create_reset_challenge()

        with self.assertRaises(PasswordResetChallengeInvalid):
            verify_storefront_customer_password_reset_code(
                business=self.other_business,
                identifier=self.customer.email,
                code="123456",
            )

        self.assertEqual(StorefrontCustomerPasswordResetGrant.objects.count(), 0)

    def test_confirm_reset_changes_password_consumes_grant_and_revokes_sessions(self):
        self.create_reset_challenge()
        tokens = issue_storefront_customer_token_pair(customer=self.customer)
        raw_grant, _ = verify_storefront_customer_password_reset_code(
            business=self.business,
            identifier=self.customer.email,
            code="123456",
        )

        confirm_storefront_customer_password_reset(
            raw_grant=raw_grant,
            new_password="NewCustomerPassword456!",
        )

        self.customer.refresh_from_db()
        grant = StorefrontCustomerPasswordResetGrant.objects.get(customer=self.customer)
        session = StorefrontCustomerSession.objects.get(id=tokens["session_id"])
        self.assertTrue(self.customer.check_password("NewCustomerPassword456!"))
        self.assertIsNotNone(grant.consumed_at)
        self.assertIsNotNone(session.revoked_at)
        self.assertEqual(
            session.revoke_reason,
            StorefrontCustomerSession.RevokeReason.PASSWORD_RESET,
        )

    def test_confirm_reset_rejects_same_password(self):
        self.create_reset_challenge()
        raw_grant, _ = verify_storefront_customer_password_reset_code(
            business=self.business,
            identifier=self.customer.email,
            code="123456",
        )

        with self.assertRaises(PasswordResetPasswordUnchanged):
            confirm_storefront_customer_password_reset(
                raw_grant=raw_grant,
                new_password="OldCustomerPassword123!",
            )

        grant = StorefrontCustomerPasswordResetGrant.objects.get(customer=self.customer)
        self.assertIsNone(grant.consumed_at)
