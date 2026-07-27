from rest_framework import status

from .response import APIResponse


class SuccessResponse(APIResponse):
    """
    Standard success response.
    """

    def __init__(
        self,
        message="Success.",
        data=None,
        meta=None,
        status_code=status.HTTP_200_OK,
    ):
        super().__init__(
            success=True,
            message=message,
            data=data,
            errors=None,
            meta=meta,
            status=status_code,
        )