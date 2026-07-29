from common.exceptions.handlers import (
    teed_exception_handler,
)
from common.exceptions.modules.identity import (
    EmailVerificationCodeInvalid,
)
from django.test import SimpleTestCase
from rest_framework import status
from rest_framework.exceptions import (
    ErrorDetail,
    NotAuthenticated,
    ValidationError,
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
                "message": ("The email verification code is invalid."),
                "data": None,
                "errors": {
                    "code": ("email_verification_code_invalid"),
                },
                "meta": {},
            },
        )

    def test_validation_error_preserves_field_codes(self):
        response = teed_exception_handler(
            ValidationError(
                {
                    "email": [
                        ErrorDetail(
                            "Enter a valid email address.",
                            code="invalid",
                        )
                    ],
                    "profile": {
                        "name": [
                            ErrorDetail(
                                "This field is required.",
                                code="required",
                            )
                        ]
                    },
                }
            ),
            context={},
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_400_BAD_REQUEST,
        )
        self.assertEqual(
            response.data["message"],
            "Request validation failed.",
        )
        self.assertEqual(
            response.data["errors"],
            {
                "code": "validation_error",
                "fields": {
                    "email": [
                        {
                            "code": "invalid",
                            "message": ("Enter a valid email address."),
                        }
                    ],
                    "profile": {
                        "name": [
                            {
                                "code": "required",
                                "message": ("This field is required."),
                            }
                        ]
                    },
                },
            },
        )

    def test_non_field_validation_error_has_stable_path(self):
        response = teed_exception_handler(
            ValidationError(
                [
                    ErrorDetail(
                        "The submitted values conflict.",
                        code="invalid_combination",
                    )
                ]
            ),
            context={},
        )

        self.assertEqual(
            response.data["errors"]["fields"],
            {
                "non_field_errors": [
                    {
                        "code": "invalid_combination",
                        "message": ("The submitted values conflict."),
                    }
                ]
            },
        )

    def test_other_drf_exception_uses_stable_code(self):
        response = teed_exception_handler(
            NotAuthenticated(),
            context={},
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_401_UNAUTHORIZED,
        )
        self.assertEqual(
            response.data["errors"],
            {
                "code": "not_authenticated",
            },
        )

    def test_unhandled_exception_is_logged_and_safe(self):
        with self.assertLogs("teed", level="ERROR") as logs:
            response = teed_exception_handler(
                RuntimeError("Sensitive diagnostic."),
                context={},
            )

        self.assertEqual(
            response.status_code,
            status.HTTP_500_INTERNAL_SERVER_ERROR,
        )
        self.assertEqual(
            response.data,
            {
                "success": False,
                "message": "An unexpected error occurred.",
                "data": None,
                "errors": {
                    "code": "internal_server_error",
                },
                "meta": {},
            },
        )
        self.assertNotIn(
            "Sensitive diagnostic.",
            response.data["message"],
        )
        self.assertIn(
            "Unhandled API exception.",
            logs.output[0],
        )
