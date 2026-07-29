import logging

from rest_framework import status
from rest_framework.exceptions import APIException, ErrorDetail, ValidationError
from rest_framework.views import exception_handler

from common.exceptions.base import TEEDException
from common.responses import ErrorResponse

logger = logging.getLogger("teed")


def _serialize_validation_detail(detail):
    if isinstance(detail, dict):
        return {
            str(field): _serialize_validation_detail(value)
            for field, value in detail.items()
        }

    if isinstance(detail, (list, tuple)):
        return [_serialize_validation_detail(value) for value in detail]

    if isinstance(detail, ErrorDetail):
        return {
            "code": detail.code,
            "message": str(detail),
        }

    return {
        "code": "invalid",
        "message": str(detail),
    }


def _api_exception_code(exc):
    if not isinstance(exc, APIException):
        return "request_failed"

    codes = exc.get_codes()

    if isinstance(codes, str):
        return codes

    if isinstance(codes, dict):
        detail_code = codes.get("detail")
        if isinstance(detail_code, str):
            return detail_code

    return getattr(exc, "default_code", "request_failed")


def teed_exception_handler(exc, context):
    """
    Convert domain, DRF, and unexpected exceptions into TEED's
    standard API error envelope.
    """

    if isinstance(exc, TEEDException):
        return ErrorResponse(
            message=exc.message,
            errors={
                "code": exc.code,
            },
            status_code=exc.status_code,
        )

    response = exception_handler(
        exc,
        context,
    )

    if isinstance(exc, ValidationError) and response is not None:
        detail = response.data
        fields = (
            _serialize_validation_detail(detail)
            if isinstance(detail, dict)
            else {
                "non_field_errors": _serialize_validation_detail(detail),
            }
        )

        return ErrorResponse(
            message="Request validation failed.",
            errors={
                "code": "validation_error",
                "fields": fields,
            },
            status_code=response.status_code,
        )

    if response is not None:
        return ErrorResponse(
            message="Request failed.",
            errors={
                "code": _api_exception_code(exc),
            },
            status_code=response.status_code,
        )

    logger.error(
        "Unhandled API exception.",
        exc_info=(
            type(exc),
            exc,
            exc.__traceback__,
        ),
        extra={
            "view": context.get("view").__class__.__name__
            if context.get("view") is not None
            else None,
        },
    )

    return ErrorResponse(
        message="An unexpected error occurred.",
        errors={
            "code": "internal_server_error",
        },
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
    )
