from common.exceptions.modules.identity import (
    EmailVerificationChallengeNotFound,
    EmailVerificationDailyLimitReached,
    EmailVerificationResendCooldown,
)
from common.responses import SuccessResponse
from django.utils.decorators import method_decorator
from django.views.decorators.csrf import csrf_protect
from rest_framework.permissions import AllowAny
from rest_framework.views import APIView

from ..selectors import get_user_by_email
from ..serializers import (
    EmailVerificationResendSerializer,
    EmailVerificationSerializer,
)
from ..services import (
    issue_email_verification_challenge,
    issue_token_pair,
    verify_email_verification_code,
)
from ..throttles import (
    EmailVerificationResendAccountThrottle,
    EmailVerificationResendIPThrottle,
)
from .session_cookies import (
    access_token_response,
    get_request_session_metadata,
    set_refresh_cookie,
)


@method_decorator(csrf_protect, name="dispatch")
class EmailVerificationAPIView(APIView):
    serializer_class = EmailVerificationSerializer
    permission_classes = [AllowAny]
    authentication_classes = []

    def post(self, request):
        serializer = EmailVerificationSerializer(
            data=request.data,
        )
        serializer.is_valid(
            raise_exception=True,
        )

        email = serializer.validated_data["email"]
        code = serializer.validated_data["code"]

        user = get_user_by_email(
            email=email,
        )

        if user is None:
            raise EmailVerificationChallengeNotFound()

        verify_email_verification_code(
            user=user,
            code=code,
            **get_request_session_metadata(request),
        )

        tokens = issue_token_pair(
            user=user,
            **get_request_session_metadata(request),
        )

        response = SuccessResponse(
            message="Email verified successfully.",
            data={
                "user_id": str(user.id),
                "email": user.email,
                "is_email_verified": True,
                "next_step": "complete_onboarding",
                "tokens": access_token_response(tokens),
            },
        )
        set_refresh_cookie(
            response,
            refresh_token=tokens["refresh"],
            expires_at=tokens["refresh_expires_at"],
        )
        return response


class EmailVerificationResendAPIView(APIView):
    serializer_class = EmailVerificationResendSerializer
    permission_classes = [AllowAny]
    authentication_classes = []
    throttle_classes = [
        EmailVerificationResendIPThrottle,
        EmailVerificationResendAccountThrottle,
    ]

    def post(self, request):
        serializer = EmailVerificationResendSerializer(
            data=request.data,
        )
        serializer.is_valid(
            raise_exception=True,
        )

        email = serializer.validated_data["email"]

        user = get_user_by_email(
            email=email,
        )

        if user is not None and not user.is_email_verified:
            try:
                issue_email_verification_challenge(
                    user=user,
                    enforce_resend_limits=True,
                    **get_request_session_metadata(request),
                )
            except (
                EmailVerificationDailyLimitReached,
                EmailVerificationResendCooldown,
            ):
                pass

        return SuccessResponse(
            message=(
                "If an unverified account exists for "
                "that email, a new verification code "
                "has been sent."
            ),
            data=None,
        )
