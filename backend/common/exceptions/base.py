from rest_framework import status


class TEEDException(Exception):
    """
    Base exception for the TEED platform.
    """

    default_message = "An unexpected error occurred."
    default_code = "internal_error"
    default_status_code = status.HTTP_500_INTERNAL_SERVER_ERROR

    def __init__(
        self,
        message=None,
        code=None,
        status_code=None,
    ):
        self.message = message or self.default_message
        self.code = code or self.default_code
        self.status_code = status_code or self.default_status_code

        super().__init__(self.message)