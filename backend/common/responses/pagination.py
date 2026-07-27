from rest_framework import status

from .response import APIResponse


class PaginatedResponse(APIResponse):
    """
    Standard response for paginated TEED API results.
    """

    def __init__(
        self,
        *,
        data,
        page: int,
        page_size: int,
        total_records: int,
        total_pages: int,
        has_next: bool,
        has_previous: bool,
        message="Resources retrieved successfully.",
        status_code=status.HTTP_200_OK,
    ):
        super().__init__(
            success=True,
            message=message,
            data=data,
            errors=None,
            meta={
                "page": page,
                "page_size": page_size,
                "total_records": total_records,
                "total_pages": total_pages,
                "has_next": has_next,
                "has_previous": has_previous,
            },
            status=status_code,
        )