from django.test import SimpleTestCase
from rest_framework import status
from rest_framework.exceptions import ValidationError

from common.exceptions.handlers import (
    teed_exception_handler,
)
from common.exceptions.modules.identity import (
    EmailVerificationCodeInvalid,
)


class TEEDExceptionHandlerTests(SimpleTestCase):
    def test_domain_exception_uses_teed_envelope(
        self,
    ):
        response = teed_exception_handler(
            EmailVerificationCodeInvalid(),
            context={},
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_400_BAD_REQUEST,
        )
        self.assertEqual(
            response.data,
            {
                "success": False,
                "message": (
                    "The email verification code "
                    "is invalid."
                ),
                "data": None,
                "errors": {
                    "code": (
                        "email_verification_code_invalid"
                    ),
                },
                "meta": {},
            },
        )

    def test_drf_exception_uses_teed_envelope(self):
        response = teed_exception_handler(
            ValidationError(
                {
                    "email": [
                        "Enter a valid email address."
                    ]
                }
            ),
            context={},
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_400_BAD_REQUEST,
        )
        self.assertFalse(
            response.data["success"]
        )
        self.assertEqual(
            response.data["message"],
            "Request failed.",
        )
        self.assertIn(
            "email",
            response.data["errors"],
        )

    def test_unhandled_exception_returns_none(self):
        response = teed_exception_handler(
            RuntimeError("Unexpected failure."),
            context={},
        )

        self.assertIsNone(response)