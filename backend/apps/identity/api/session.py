from common.responses import SuccessResponse
from django.middleware.csrf import get_token
from django.utils.decorators import method_decorator
from django.views.decorators.csrf import csrf_protect, ensure_csrf_cookie
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.views import APIView

from ..serializers import CurrentUserSerializer, SessionActionSerializer
from ..services import (
    revoke_all_user_sessions,
    revoke_refresh_session,
    rotate_refresh_token,
)
from .session_cookies import (
    access_token_response,
    clear_refresh_cookie,
    get_refresh_cookie,
    set_refresh_cookie,
)


@method_decorator(ensure_csrf_cookie, name="dispatch")
class SessionCSRFAPIView(APIView):
    serializer_class = SessionActionSerializer
    permission_classes = [AllowAny]
    authentication_classes = []

    def get(self, request):
        return SuccessResponse(
            message="CSRF protection initialized.",
            data={
                "csrf_token": get_token(request),
            },
        )


@method_decorator(csrf_protect, name="dispatch")
class SessionRefreshAPIView(APIView):
    serializer_class = SessionActionSerializer
    permission_classes = [AllowAny]
    authentication_classes = []

    def post(self, request):
        tokens = rotate_refresh_token(
            raw_refresh_token=get_refresh_cookie(request),
        )
        response = SuccessResponse(
            message="Session refreshed successfully.",
            data={
                "user": CurrentUserSerializer(
                    tokens["user"],
                ).data,
                "tokens": access_token_response(tokens),
            },
        )
        set_refresh_cookie(
            response,
            refresh_token=tokens["refresh"],
            expires_at=tokens["refresh_expires_at"],
        )
        return response


@method_decorator(csrf_protect, name="dispatch")
class SessionLogoutAPIView(APIView):
    serializer_class = SessionActionSerializer
    permission_classes = [AllowAny]
    authentication_classes = []

    def post(self, request):
        revoke_refresh_session(
            raw_refresh_token=get_refresh_cookie(request),
        )
        response = SuccessResponse(
            message="Signed out successfully.",
            data=None,
        )
        clear_refresh_cookie(response)
        return response


@method_decorator(csrf_protect, name="dispatch")
class SessionLogoutAllAPIView(APIView):
    serializer_class = SessionActionSerializer
    permission_classes = [IsAuthenticated]

    def post(self, request):
        revoked_count = revoke_all_user_sessions(
            user=request.user,
        )
        response = SuccessResponse(
            message="Signed out from all sessions successfully.",
            data={
                "revoked_sessions": revoked_count,
            },
        )
        clear_refresh_cookie(response)
        return response


class CurrentSessionAPIView(APIView):
    serializer_class = CurrentUserSerializer
    permission_classes = [IsAuthenticated]

    def get(self, request):
        return SuccessResponse(
            message="Current session retrieved successfully.",
            data={
                "user": CurrentUserSerializer(
                    request.user,
                ).data,
                "session_id": str(request.auth["session_id"]),
            },
        )
