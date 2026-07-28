from rest_framework.response import Response


class APIResponse(Response):
    """
    Base response class for all TEED API responses.
    """

    def __init__(
        self,
        *,
        success: bool,
        message: str,
        data=None,
        errors=None,
        meta=None,
        status=200,
        **kwargs,
    ):
        body = {
            "success": success,
            "message": message,
            "data": data,
            "errors": errors,
            "meta": meta or {},
        }

        super().__init__(
            data=body,
            status=status,
            **kwargs,
        )
