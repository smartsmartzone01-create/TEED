import os
from unittest.mock import patch

from common.exceptions.modules.identity import (
    EmailAlreadyRegistered,
    InvalidCredentials,
)
from django.conf import settings
from django.contrib.auth import get_user_model
from django.core.cache import cache
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from ..models import ExternalIdentity

User = get_user_model()


@patch.dict(
    os.environ,
    {"GOOGLE_CLIENT_ID": "test-client.apps.googleusercontent.com"},
    clear=False,
)
class GoogleAuthenticationAPITests(APITestCase):
    def setUp(self):
        cache.clear()
        self.url = reverse("identity:google-authentication")

    def google_claims(
        self,
        *,
        subject="google-subject-1",
        email="googleuser@gmail.com",
        given_name="Ada",
        family_name="Lovelace",
        email_verified=True,
        hosted_domain=None,
    ):
        claims = {
            "sub": subject,
            "email": email,
            "given_name": given_name,
            "family_name": family_name,
            "email_verified": email_verified,
        }
        if hosted_domain:
            claims["hd"] = hosted_domain
        return claims

    @patch(
        "apps.identity.services.google_authentication."
        "id_token.verify_oauth2_token"
    )
    def test_new_gmail_identity_creates_google_user_and_session(self, verify_token):
        verify_token.return_value = self.google_claims()

        response = self.client.post(
            self.url,
            {"credential": "signed-google-credential"},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        data = response.data["data"]
        user = User.objects.get(email="googleuser@gmail.com")
        external_identity = ExternalIdentity.objects.get(
            provider=ExternalIdentity.Provider.GOOGLE,
            subject="google-subject-1",
        )

        self.assertEqual(external_identity.user_id, user.id)
        self.assertEqual(external_identity.email_snapshot, user.email)
        self.assertTrue(user.is_email_verified)
        self.assertFalse(user.has_usable_password())
        self.assertEqual(user.first_name, "Ada")
        self.assertEqual(user.last_name, "Lovelace")
        self.assertEqual(data["user_id"], str(user.id))
        self.assertEqual(data["next_step"], "complete_onboarding")
        self.assertEqual(data["suggested_username"], "adalovelace")
        self.assertIn("access", data["tokens"])
        self.assertNotIn("refresh", data["tokens"])
        self.assertIn(settings.REFRESH_TOKEN_COOKIE_NAME, response.cookies)
        self.assertEqual(
            verify_token.call_args.args[2],
            "test-client.apps.googleusercontent.com",
        )

    @patch(
        "apps.identity.services.google_authentication."
        "id_token.verify_oauth2_token"
    )
    def test_existing_gmail_user_is_safely_linked_without_duplicate(self, verify_token):
        user = User.objects.create_user(
            email="existing@gmail.com",
            password="StrongTestPassword123!",
            is_email_verified=False,
        )
        verify_token.return_value = self.google_claims(
            subject="google-existing",
            email=user.email,
            given_name="Existing",
            family_name="Member",
        )

        response = self.client.post(
            self.url,
            {"credential": "signed-google-credential"},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        user.refresh_from_db()
        self.assertEqual(User.objects.filter(email=user.email).count(), 1)
        self.assertTrue(user.is_email_verified)
        self.assertTrue(user.has_usable_password())
        self.assertTrue(
            ExternalIdentity.objects.filter(
                user=user,
                provider=ExternalIdentity.Provider.GOOGLE,
                subject="google-existing",
            ).exists()
        )
        self.assertEqual(response.data["data"]["user_id"], str(user.id))

    @patch(
        "apps.identity.services.google_authentication."
        "id_token.verify_oauth2_token"
    )
    def test_verified_workspace_email_can_link_existing_user(self, verify_token):
        user = User.objects.create_user(
            email="member@company.example",
            password="StrongTestPassword123!",
            is_email_verified=False,
        )
        verify_token.return_value = self.google_claims(
            subject="workspace-google",
            email=user.email,
            email_verified=True,
            hosted_domain="company.example",
        )

        response = self.client.post(
            self.url,
            {"credential": "signed-google-credential"},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        user.refresh_from_db()
        self.assertTrue(user.is_email_verified)
        self.assertTrue(
            ExternalIdentity.objects.filter(
                user=user,
                subject="workspace-google",
            ).exists()
        )

    @patch(
        "apps.identity.services.google_authentication."
        "id_token.verify_oauth2_token"
    )
    def test_linked_google_subject_remains_authoritative_if_email_snapshot_changes(
        self,
        verify_token,
    ):
        user = User.objects.create_user(
            email="original@gmail.com",
            password=None,
            is_email_verified=True,
        )
        external_identity = ExternalIdentity.objects.create(
            user=user,
            provider=ExternalIdentity.Provider.GOOGLE,
            subject="stable-google-subject",
            email_snapshot=user.email,
        )
        verify_token.return_value = self.google_claims(
            subject="stable-google-subject",
            email="renamed@gmail.com",
        )

        response = self.client.post(
            self.url,
            {"credential": "signed-google-credential"},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        user.refresh_from_db()
        external_identity.refresh_from_db()
        self.assertEqual(response.data["data"]["user_id"], str(user.id))
        self.assertEqual(user.email, "original@gmail.com")
        self.assertEqual(external_identity.email_snapshot, "renamed@gmail.com")
        self.assertFalse(User.objects.filter(email="renamed@gmail.com").exists())

    @patch(
        "apps.identity.services.google_authentication."
        "id_token.verify_oauth2_token"
    )
    def test_third_party_google_email_does_not_silently_link_existing_user(
        self,
        verify_token,
    ):
        user = User.objects.create_user(
            email="owner@example.com",
            password="StrongTestPassword123!",
            is_email_verified=True,
        )
        verify_token.return_value = self.google_claims(
            subject="third-party-google",
            email=user.email,
            email_verified=True,
            hosted_domain=None,
        )

        response = self.client.post(
            self.url,
            {"credential": "signed-google-credential"},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_409_CONFLICT)
        self.assertEqual(
            response.data["errors"]["code"],
            EmailAlreadyRegistered.default_code,
        )
        self.assertFalse(
            ExternalIdentity.objects.filter(
                subject="third-party-google",
            ).exists()
        )

    @patch(
        "apps.identity.services.google_authentication."
        "id_token.verify_oauth2_token"
    )
    def test_new_third_party_google_identity_can_complete_onboarding(
        self,
        verify_token,
    ):
        verify_token.return_value = self.google_claims(
            subject="third-party-new",
            email="newuser@example.com",
            given_name="Grace",
            family_name="Hopper",
            email_verified=True,
            hosted_domain=None,
        )

        auth_response = self.client.post(
            self.url,
            {"credential": "signed-google-credential"},
            format="json",
        )

        self.assertEqual(auth_response.status_code, status.HTTP_200_OK)
        auth_data = auth_response.data["data"]
        user = User.objects.get(email="newuser@example.com")
        self.assertFalse(user.is_email_verified)
        self.assertFalse(user.is_phone_verified)
        self.assertFalse(user.has_usable_password())
        self.assertTrue(
            ExternalIdentity.objects.filter(
                user=user,
                subject="third-party-new",
            ).exists()
        )

        onboarding_response = self.client.post(
            reverse("identity:onboarding"),
            {
                "username": auth_data["suggested_username"],
                "country_code": "TZ",
                "phone_number": "+255713456789",
            },
            format="json",
            HTTP_AUTHORIZATION=f"Bearer {auth_data['tokens']['access']}",
        )

        self.assertEqual(onboarding_response.status_code, status.HTTP_200_OK)
        user.refresh_from_db()
        self.assertTrue(user.is_onboarding_complete)

    @patch(
        "apps.identity.services.google_authentication."
        "id_token.verify_oauth2_token"
    )
    def test_invalid_google_credential_is_rejected(self, verify_token):
        verify_token.side_effect = ValueError("invalid token")

        response = self.client.post(
            self.url,
            {"credential": "invalid-google-credential"},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertEqual(
            response.data["errors"]["code"],
            InvalidCredentials.default_code,
        )
        self.assertFalse(ExternalIdentity.objects.exists())
