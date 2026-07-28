from rest_framework.views import exception_handler

from common.exceptions.base import TEEDException
from common.responses import ErrorResponse


def teed_exception_handler(exc, context):
    """
    Convert domain and DRF exceptions into TEED's
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

    if response is None:
        return None

    return ErrorResponse(
        message="Request failed.",
        errors=response.data,
        status_code=response.status_code,
    )
