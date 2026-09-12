from apps.workspaces.models import Business
from common.exceptions.modules.identity import (
    EmailVerificationRequired,
    InvalidCredentials,
    PhoneVerificationRequired,
    RefreshTokenReuseDetected,
    SessionInvalid,
)
from django.contrib.auth import get_user_model
from django.test import TestCase
from rest_framework_simplejwt.exceptions import InvalidToken
from rest_framework_simplejwt.tokens import AccessToken

from ..authentication import (
    SessionJWTAuthentication,
    StorefrontCustomerJWTAuthentication,
)
from ..models import StorefrontCustomer, StorefrontCustomerSession
from ..services.storefront_customer_session import (
    STOREFRONT_CUSTOMER_AUDIENCE,
    decode_storefront_customer_refresh_token,
    issue_storefront_customer_token_pair,
    login_storefront_customer_with_email,
    login_storefront_customer_with_phone,
    revoke_all_storefront_customer_sessions,
    revoke_storefront_customer_refresh_session,
    rotate_storefront_customer_refresh_token,
)

User = get_user_model()


class StorefrontCustomerSessionServiceTests(TestCase):
    def setUp(self):
        self.owner = User.objects.create_user(
            email="session-owner@example.com",
            password="StrongOwnerPassword123!",
        )
        self.business = Business.objects.create(
            name="Session Storefront",
            public_handle="session-storefront",
            created_by=self.owner,
        )
        self.other_business = Business.objects.create(
            name="Other Storefront",
            public_handle="other-session-storefront",
            created_by=self.owner,
        )
        self.customer = self.create_customer(
            business=self.business,
            email="buyer@example.com",
            phone_number="+255712345678",
            email_verified=True,
            phone_verified=True,
        )

    def create_customer(
        self,
        *,
        business,
        email=None,
        phone_number=None,
        email_verified=False,
        phone_verified=False,
        password="StrongCustomerPassword123!",
    ):
        customer = StorefrontCustomer.objects.create(
            business=business,
            email=email,
            phone_number=phone_number,
            is_email_verified=email_verified,
            is_phone_verified=phone_verified,
        )
        customer.set_password(password)
        customer.save(update_fields=["password", "updated_at"])
        return customer

    def test_email_login_issues_isolated_storefront_customer_tokens(self):
        result = login_storefront_customer_with_email(
            business=self.business,
            email=" BUYER@example.com ",
            password="StrongCustomerPassword123!",
            ip_address="127.0.0.1",
            user_agent="Mozilla/5.0 Windows Chrome/120.0",
        )

        self.assertEqual(result["customer"].id, self.customer.id)
        self.assertEqual(StorefrontCustomerSession.objects.count(), 1)

        tokens = result["tokens"]
        access = AccessToken(tokens["access"])
        self.assertEqual(access["aud"], STOREFRONT_CUSTOMER_AUDIENCE)
        self.assertEqual(access["customer_id"], str(self.customer.id))
        self.assertEqual(access["business_id"], str(self.business.id))
        self.assertEqual(access["session_id"], tokens["session_id"])
        self.assertNotIn("user_id", access.payload)

        refresh_claims = decode_storefront_customer_refresh_token(
            tokens["refresh"],
        )
        self.assertEqual(refresh_claims["customer_id"], str(self.customer.id))
        self.assertEqual(refresh_claims["business_id"], str(self.business.id))

    def test_token_issuance_rejects_unverified_customer(self):
        customer = self.create_customer(
            business=self.business,
            email="direct-unverified@example.com",
        )

        with self.assertRaises(ValueError):
            issue_storefront_customer_token_pair(customer=customer)

        self.assertEqual(
            StorefrontCustomerSession.objects.filter(customer=customer).count(),
            0,
        )

    def test_storefront_access_token_authenticates_only_customer_realm(self):
        tokens = login_storefront_customer_with_email(
            business=self.business,
            email=self.customer.email,
            password="StrongCustomerPassword123!",
        )["tokens"]

        customer_auth = StorefrontCustomerJWTAuthentication()
        customer_token = customer_auth.get_validated_token(tokens["access"])
        authenticated_customer = customer_auth.get_user(customer_token)
        self.assertEqual(authenticated_customer.id, self.customer.id)

        workspace_auth = SessionJWTAuthentication()
        workspace_token = workspace_auth.get_validated_token(tokens["access"])
        with self.assertRaises(InvalidToken):
            workspace_auth.get_user(workspace_token)

    def test_email_login_requires_verified_email(self):
        customer = self.create_customer(
            business=self.business,
            email="unverified@example.com",
        )

        with self.assertRaises(EmailVerificationRequired):
            login_storefront_customer_with_email(
                business=self.business,
                email=customer.email,
                password="StrongCustomerPassword123!",
            )

    def test_phone_login_requires_verified_phone(self):
        customer = self.create_customer(
            business=self.business,
            phone_number="+255713456789",
        )

        with self.assertRaises(PhoneVerificationRequired):
            login_storefront_customer_with_phone(
                business=self.business,
                phone_number=customer.phone_number,
                password="StrongCustomerPassword123!",
            )

    def test_phone_login_works_for_verified_phone(self):
        result = login_storefront_customer_with_phone(
            business=self.business,
            phone_number=self.customer.phone_number,
            password="StrongCustomerPassword123!",
        )

        self.assertEqual(result["customer"].id, self.customer.id)
        self.assertEqual(StorefrontCustomerSession.objects.count(), 1)

    def test_invalid_password_is_rejected(self):
        with self.assertRaises(InvalidCredentials):
            login_storefront_customer_with_email(
                business=self.business,
                email=self.customer.email,
                password="WrongPassword123!",
            )

        self.assertEqual(StorefrontCustomerSession.objects.count(), 0)

    def test_login_is_scoped_to_business(self):
        other_customer = self.create_customer(
            business=self.other_business,
            email=self.customer.email,
            email_verified=True,
            password="OtherBusinessPassword123!",
        )

        result = login_storefront_customer_with_email(
            business=self.other_business,
            email=self.customer.email,
            password="OtherBusinessPassword123!",
        )

        self.assertEqual(result["customer"].id, other_customer.id)
        claims = AccessToken(result["tokens"]["access"])
        self.assertEqual(claims["business_id"], str(self.other_business.id))

    def test_refresh_rotation_updates_jti_and_revokes_family_on_reuse(self):
        tokens = login_storefront_customer_with_email(
            business=self.business,
            email=self.customer.email,
            password="StrongCustomerPassword123!",
        )["tokens"]
        old_refresh = tokens["refresh"]
        old_claims = decode_storefront_customer_refresh_token(old_refresh)

        rotated = rotate_storefront_customer_refresh_token(
            raw_refresh_token=old_refresh,
        )
        new_claims = decode_storefront_customer_refresh_token(rotated["refresh"])
        self.assertNotEqual(old_claims["jti"], new_claims["jti"])

        session = StorefrontCustomerSession.objects.get(id=tokens["session_id"])
        self.assertEqual(session.current_refresh_jti, new_claims["jti"])
        self.assertIsNone(session.revoked_at)

        with self.assertRaises(RefreshTokenReuseDetected):
            rotate_storefront_customer_refresh_token(
                raw_refresh_token=old_refresh,
            )

        session.refresh_from_db()
        self.assertIsNotNone(session.revoked_at)
        self.assertEqual(
            session.revoke_reason,
            StorefrontCustomerSession.RevokeReason.REFRESH_REUSE,
        )

    def test_logout_revokes_session_and_invalidates_existing_access(self):
        tokens = login_storefront_customer_with_email(
            business=self.business,
            email=self.customer.email,
            password="StrongCustomerPassword123!",
        )["tokens"]

        revoke_storefront_customer_refresh_session(
            raw_refresh_token=tokens["refresh"],
        )

        session = StorefrontCustomerSession.objects.get(id=tokens["session_id"])
        self.assertIsNotNone(session.revoked_at)
        self.assertEqual(
            session.revoke_reason,
            StorefrontCustomerSession.RevokeReason.LOGOUT,
        )

        customer_auth = StorefrontCustomerJWTAuthentication()
        validated = customer_auth.get_validated_token(tokens["access"])
        with self.assertRaises(SessionInvalid):
            customer_auth.get_user(validated)

    def test_revoke_all_customer_sessions(self):
        for _ in range(2):
            login_storefront_customer_with_email(
                business=self.business,
                email=self.customer.email,
                password="StrongCustomerPassword123!",
            )

        revoked_count = revoke_all_storefront_customer_sessions(
            customer=self.customer,
        )

        self.assertEqual(revoked_count, 2)
        self.assertEqual(
            StorefrontCustomerSession.objects.filter(
                customer=self.customer,
                revoked_at__isnull=True,
            ).count(),
            0,
        )
