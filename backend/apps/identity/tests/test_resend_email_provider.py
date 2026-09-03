import json
import os
from unittest.mock import patch
from urllib.error import HTTPError

from django.test import SimpleTestCase, override_settings

from ..email import DeliveryMessage, DeliveryProviderError, ResendEmailProvider


class FakeResponse:
    def __init__(self, payload):
        self.payload = payload

    def __enter__(self):
        return self

    def __exit__(self, exc_type, exc, traceback):
        return False

    def read(self):
        return json.dumps(self.payload).encode("utf-8")


@override_settings(DEFAULT_FROM_EMAIL="Tunakuza <onboarding@resend.dev>")
class ResendEmailProviderTests(SimpleTestCase):
    def message(self):
        return DeliveryMessage(
            subject="Verify your Tunakuza account",
            body="Your verification code is 123456.",
            recipient="delivered@resend.dev",
        )

    @patch.dict(
        os.environ,
        {
            "RESEND_API_KEY": "re_test_key",
            "RESEND_API_URL": "https://api.resend.com/emails",
            "RESEND_TIMEOUT_SECONDS": "10",
        },
        clear=False,
    )
    @patch("apps.identity.email.providers.urlopen")
    def test_send_uses_resend_api_and_idempotency_key(self, mocked_urlopen):
        mocked_urlopen.return_value = FakeResponse({"id": "email-123"})

        receipt = ResendEmailProvider().send(
            message=self.message(),
            idempotency_key="challenge:test-123",
        )

        request = mocked_urlopen.call_args.args[0]
        payload = json.loads(request.data.decode("utf-8"))
        self.assertEqual(request.full_url, "https://api.resend.com/emails")
        self.assertEqual(request.get_method(), "POST")
        self.assertEqual(request.get_header("Authorization"), "Bearer re_test_key")
        self.assertEqual(
            request.get_header("Idempotency-key"),
            "challenge:test-123",
        )
        self.assertEqual(payload["from"], "Tunakuza <onboarding@resend.dev>")
        self.assertEqual(payload["to"], ["delivered@resend.dev"])
        self.assertEqual(payload["text"], self.message().body)
        self.assertEqual(receipt.provider_message_id, "email-123")

    @patch.dict(os.environ, {"RESEND_API_KEY": ""}, clear=False)
    def test_missing_api_key_is_permanent_configuration_failure(self):
        with self.assertRaises(DeliveryProviderError) as context:
            ResendEmailProvider().send(
                message=self.message(),
                idempotency_key="challenge:no-key",
            )

        self.assertEqual(context.exception.code, "resend_not_configured")
        self.assertTrue(context.exception.permanent)

    @patch.dict(os.environ, {"RESEND_API_KEY": "re_test_key"}, clear=False)
    @patch("apps.identity.email.providers.urlopen")
    def test_forbidden_response_is_permanent(self, mocked_urlopen):
        mocked_urlopen.side_effect = HTTPError(
            "https://api.resend.com/emails",
            403,
            "Forbidden",
            None,
            None,
        )

        with self.assertRaises(DeliveryProviderError) as context:
            ResendEmailProvider().send(
                message=self.message(),
                idempotency_key="challenge:forbidden",
            )

        self.assertEqual(context.exception.code, "resend_http_403")
        self.assertTrue(context.exception.permanent)

    @patch.dict(os.environ, {"RESEND_API_KEY": "re_test_key"}, clear=False)
    @patch("apps.identity.email.providers.urlopen")
    def test_rate_limit_response_remains_retryable(self, mocked_urlopen):
        mocked_urlopen.side_effect = HTTPError(
            "https://api.resend.com/emails",
            429,
            "Too Many Requests",
            None,
            None,
        )

        with self.assertRaises(DeliveryProviderError) as context:
            ResendEmailProvider().send(
                message=self.message(),
                idempotency_key="challenge:rate-limit",
            )

        self.assertEqual(context.exception.code, "resend_http_429")
        self.assertFalse(context.exception.permanent)
