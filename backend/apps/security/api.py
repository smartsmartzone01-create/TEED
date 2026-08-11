from common.http import get_request_metadata
from common.responses import SuccessResponse
from django.utils.decorators import method_decorator
from django.views.decorators.csrf import csrf_protect
from rest_framework.exceptions import NotFound, ValidationError
from rest_framework.permissions import IsAuthenticated
from rest_framework.views import APIView

from .permissions import IsOnboardingComplete
from .selectors import active_sessions, event_data, security_events, session_data
from .serializers import EmptyActionSerializer, PasswordChangeSerializer
from .services import change_password, revoke_other_sessions, revoke_owned_session


class SecurityBaseAPIView(APIView):
    permission_classes = [IsAuthenticated, IsOnboardingComplete]


class SecurityOverviewAPIView(SecurityBaseAPIView):
    serializer_class = EmptyActionSerializer

    def get(self, request):
        sessions = active_sessions(request.user)
        events = security_events(request.user, limit=4)
        return SuccessResponse(
            message="Security overview retrieved successfully.",
            data={
                "verified_contacts": {
                    "email": request.user.is_email_verified,
                    "phone": request.user.is_phone_verified,
                },
                "active_session_count": sessions.count(),
                "recovery": {
                    "email_available": bool(
                        request.user.email and request.user.is_email_verified
                    ),
                    "phone_available": bool(
                        request.user.phone_number and request.user.is_phone_verified
                    ),
                },
                "recent_activity": [
                    event_data(item, request.auth["session_id"]) for item in events
                ],
            },
        )


@method_decorator(csrf_protect, name="dispatch")
class PasswordChangeAPIView(SecurityBaseAPIView):
    serializer_class = PasswordChangeSerializer

    def post(self, request):
        serializer = self.serializer_class(
            data=request.data, context={"request": request}
        )
        serializer.is_valid(raise_exception=True)
        count = change_password(
            user=request.user,
            current_session_id=request.auth["session_id"],
            new_password=serializer.validated_data["new_password"],
            audit_metadata=get_request_metadata(request),
        )
        return SuccessResponse(
            message="Password changed successfully.",
            data={"revoked_other_sessions": count},
        )


class SessionListAPIView(SecurityBaseAPIView):
    serializer_class = EmptyActionSerializer

    def get(self, request):
        return SuccessResponse(
            message="Active sessions retrieved successfully.",
            data={
                "sessions": [
                    session_data(item, request.auth["session_id"])
                    for item in active_sessions(request.user)
                ]
            },
        )


@method_decorator(csrf_protect, name="dispatch")
class SessionDetailAPIView(SecurityBaseAPIView):
    serializer_class = EmptyActionSerializer

    def delete(self, request, session_id):
        try:
            found = revoke_owned_session(
                user=request.user,
                session_id=session_id,
                current_session_id=request.auth["session_id"],
                audit_metadata=get_request_metadata(request),
            )
        except ValueError as exc:
            raise ValidationError(
                {
                    "session": [
                        {
                            "code": "current_session_revoke_forbidden",
                            "message": "Use log out to end the current session.",
                        }
                    ]
                }
            ) from exc
        if not found:
            raise NotFound("Session not found.", code="session_not_found")
        return SuccessResponse(message="Session revoked successfully.", data=None)


@method_decorator(csrf_protect, name="dispatch")
class OtherSessionsAPIView(SecurityBaseAPIView):
    serializer_class = EmptyActionSerializer

    def post(self, request):
        count = revoke_other_sessions(
            user=request.user,
            current_session_id=request.auth["session_id"],
            audit_metadata=get_request_metadata(request),
        )
        return SuccessResponse(
            message="Other sessions revoked successfully.",
            data={"revoked_sessions": count},
        )


class SecurityActivityAPIView(SecurityBaseAPIView):
    serializer_class = EmptyActionSerializer

    def get(self, request):
        return SuccessResponse(
            message="Security activity retrieved successfully.",
            data={
                "events": [
                    event_data(item, request.auth["session_id"])
                    for item in security_events(request.user)
                ]
            },
        )
