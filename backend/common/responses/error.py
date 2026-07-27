from rest_framework import status

from .response import APIResponse


class ErrorResponse(APIResponse):
    """
    Standard error response.
    """

    def __init__(
        self,
        message="Request failed.",
        errors=None,
        status_code=status.HTTP_400_BAD_REQUEST,
    ):
        super().__init__(
            success=False,
            message=message,
            data=None,
            errors=errors,
            meta={},
            status=status_code,
        )