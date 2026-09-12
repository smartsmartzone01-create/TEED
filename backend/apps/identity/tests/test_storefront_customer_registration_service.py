from datetime import timedelta
from types import SimpleNamespace
from unittest.mock import Mock, patch

from apps.workspaces.models import Business
from common.exceptions.modules.identity import (
    EmailAlreadyRegistered,
    EmailVerificationCodeInvalid,
    EmailVerificationResendCooldown,
    PhoneNumberAlreadyRegistered,
)
from django.contrib.auth import get_user_model
from django.contrib.auth.hashers import check_password, make_password
from django.test import TestCase, override_settings
from django.utils import timezone

from ..models import (
    StorefrontCustomer,
    StorefrontCustomerVerificationChallenge,
)
from ..services.storefront_customer_registration import (
    issue_storefront_customer_verification_challenge,
    register_storefront_customer_with_email,
    register_storefront_customer_with_phone,
    verify_storefront_customer_verification_code,
)

User = get_user_model()


@override_settings(
    EMAIL_VERIFICATION_CODE_LENGTH=6,
    EMAIL_VERIFICATION_TTL_MINUTES=10,
    EMAIL_VERIFICATION_MAX_ATTEMPTS=5,
    EMAIL_VERIFICATION_RESEND_COOLDOWN_SECONDS=60,
    EMAIL_VERIFICATION_DAILY_LIMIT=5,
)
class StorefrontCustomerRegistrationServiceTests(TestCase):
    def setUp(self):
        self.owner = User.objects.create_user(
            email="registration-owner@example.com",
            password="StrongOwnerPassword123!",
        )
        self.business = Business.objects.create(
            name="Registration Storefront",
            public_handle="registration-storefront",
            created_by=self.owner,
        )

    @patch(
        "apps.identity.services.storefront_customer_registration._generate_verification_code",
        return_value="123456",
    )
    @patch(
        "apps.identity.services.storefront_customer_registration._email_provider",
    )
    def test_register_email_customer_hashes_password_and_delivers_code(
        self,
        email_provider,
        generate_code,
    ):
        provider = Mock()
        provider.send.return_value = SimpleNamespace(
            provider_message_id="email-test-1",
        )
        email_provider.return_value = provider

        with self.captureOnCommitCallbacks(execute=True):
            customer = register_storefront_customer_with_email(
                business=self.business,
                email="  CUSTOMER@Example.COM ",
                password="StrongCustomerPassword123!",
                first_name="Asha",
            )

        self.assertEqual(customer.business_id, self.business.id)
        self.assertEqual(customer.email, "customer@example.com")
        self.assertEqual(customer.first_name, "Asha")
        self.assertNotEqual(customer.password, "StrongCustomerPassword123!")
        self.assertTrue(customer.check_password("StrongCustomerPassword123!"))
        self.assertFalse(customer.is_email_verified)

        challenge = StorefrontCustomerVerificationChallenge.objects.get(
            customer=customer,
            channel=StorefrontCustomerVerificationChallenge.Channel.EMAIL,
        )
        self.assertTrue(check_password("123456", challenge.code_digest))
        self.assertNotEqual(challenge.code_digest, "123456")
        self.assertEqual(challenge.destination, "customer@example.com")

        provider.send.assert_called_once()
        sent_message = provider.send.call_args.kwargs["message"]
        self.assertEqual(sent_message.recipient, "customer@example.com")
        self.assertIn("123456", sent_message.body)
        generate_code.assert_called_once()

    @patch(
        "apps.identity.services.storefront_customer_registration._generate_verification_code",
        return_value="654321",
    )
    @patch(
        "apps.identity.services.storefront_customer_registration.get_sms_provider",
    )
    def test_register_phone_customer_uses_shared_sms_provider(
        self,
        get_sms_provider,
        generate_code,
    ):
        provider = Mock()
        provider.send.return_value = SimpleNamespace(
            provider_message_id="sms-test-1",
        )
        get_sms_provider.return_value = provider

        with self.captureOnCommitCallbacks(execute=True):
            customer = register_storefront_customer_with_phone(
                business=self.business,
                phone_number="+255712345678",
                password="StrongCustomerPassword123!",
            )

        challenge = StorefrontCustomerVerificationChallenge.objects.get(
            customer=customer,
            channel=StorefrontCustomerVerificationChallenge.Channel.PHONE,
        )
        self.assertEqual(customer.business_id, self.business.id)
        self.assertTrue(check_password("654321", challenge.code_digest))
        self.assertFalse(customer.is_phone_verified)

        provider.send.assert_called_once()
        send_kwargs = provider.send.call_args.kwargs
        self.assertEqual(send_kwargs["to"], "+255712345678")
        self.assertIn("654321", send_kwargs["text"])
        generate_code.assert_called_once()

    def test_verify_email_code_marks_only_email_verified(self):
        customer = StorefrontCustomer.objects.create(
            business=self.business,
            email="verify-email@example.com",
        )
        StorefrontCustomerVerificationChallenge.objects.create(
            customer=customer,
            channel=StorefrontCustomerVerificationChallenge.Channel.EMAIL,
            destination=customer.email,
            code_digest=make_password("123456"),
            expires_at=timezone.now() + timedelta(minutes=10),
        )

        verify_storefront_customer_verification_code(
            customer=customer,
            channel=StorefrontCustomerVerificationChallenge.Channel.EMAIL,
            code="123456",
        )

        customer.refresh_from_db()
        self.assertTrue(customer.is_email_verified)
        self.assertFalse(customer.is_phone_verified)
        challenge = StorefrontCustomerVerificationChallenge.objects.get(
            customer=customer,
        )
        self.assertIsNotNone(challenge.consumed_at)

    def test_verify_phone_code_marks_only_phone_verified(self):
        customer = StorefrontCustomer.objects.create(
            business=self.business,
            phone_number="+255713456789",
        )
        StorefrontCustomerVerificationChallenge.objects.create(
            customer=customer,
            channel=StorefrontCustomerVerificationChallenge.Channel.PHONE,
            destination=customer.phone_number,
            code_digest=make_password("654321"),
            expires_at=timezone.now() + timedelta(minutes=10),
        )

        verify_storefront_customer_verification_code(
            customer=customer,
            channel=StorefrontCustomerVerificationChallenge.Channel.PHONE,
            code="654321",
        )

        customer.refresh_from_db()
        self.assertTrue(customer.is_phone_verified)
        self.assertFalse(customer.is_email_verified)

    def test_invalid_code_increments_attempt_count(self):
        customer = StorefrontCustomer.objects.create(
            business=self.business,
            email="invalid-code@example.com",
        )
        challenge = StorefrontCustomerVerificationChallenge.objects.create(
            customer=customer,
            channel=StorefrontCustomerVerificationChallenge.Channel.EMAIL,
            destination=customer.email,
            code_digest=make_password("123456"),
            expires_at=timezone.now() + timedelta(minutes=10),
        )

        with self.assertRaises(EmailVerificationCodeInvalid):
            verify_storefront_customer_verification_code(
                customer=customer,
                channel=StorefrontCustomerVerificationChallenge.Channel.EMAIL,
                code="000000",
            )

        challenge.refresh_from_db()
        customer.refresh_from_db()
        self.assertEqual(challenge.attempt_count, 1)
        self.assertFalse(customer.is_email_verified)

    def test_resend_cooldown_uses_shared_verification_policy(self):
        customer = StorefrontCustomer.objects.create(
            business=self.business,
            email="resend@example.com",
        )
        issue_storefront_customer_verification_challenge(
            customer=customer,
            channel=StorefrontCustomerVerificationChallenge.Channel.EMAIL,
        )

        with self.assertRaises(EmailVerificationResendCooldown):
            issue_storefront_customer_verification_challenge(
                customer=customer,
                channel=StorefrontCustomerVerificationChallenge.Channel.EMAIL,
                enforce_resend_limits=True,
            )

    def test_duplicate_email_registration_is_rejected_within_business(self):
        existing = StorefrontCustomer.objects.create(
            business=self.business,
            email="duplicate@example.com",
        )
        existing.set_password("StrongCustomerPassword123!")
        existing.save(update_fields=["password", "updated_at"])

        with self.assertRaises(EmailAlreadyRegistered):
            register_storefront_customer_with_email(
                business=self.business,
                email="DUPLICATE@example.com",
                password="AnotherStrongPassword123!",
            )

    def test_duplicate_phone_registration_is_rejected_within_business(self):
        existing = StorefrontCustomer.objects.create(
            business=self.business,
            phone_number="+255714567890",
        )
        existing.set_password("StrongCustomerPassword123!")
        existing.save(update_fields=["password", "updated_at"])

        with self.assertRaises(PhoneNumberAlreadyRegistered):
            register_storefront_customer_with_phone(
                business=self.business,
                phone_number="+255714567890",
                password="AnotherStrongPassword123!",
            )
