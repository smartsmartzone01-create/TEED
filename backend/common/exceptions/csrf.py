from django.http import JsonResponse


def csrf_failure(request, reason=""):
    """Return CSRF failures through TEED's standard error envelope."""

    return JsonResponse(
        {
            "success": False,
            "message": "Request failed.",
            "data": None,
            "errors": {
                "code": "csrf_failed",
            },
            "meta": {},
        },
        status=403,
    )
