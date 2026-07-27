from rest_framework.permissions import AllowAny
from rest_framework.views import APIView

from common.exceptions.modules.identity import (
    EmailVerificationChallengeNotFound,
)
from common.responses import SuccessResponse

from ..serializers import (
    EmailVerificationResendSerializer,
    EmailVerificationSerializer,
)
from ..selectors import get_user_by_email
from ..services import (
    issue_email_verification_challenge,
    issue_token_pair,
    verify_email_verification_code,
)


class EmailVerificationAPIView(APIView):
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
        )

        tokens = issue_token_pair(
            user=user,
        )

        return SuccessResponse(
            message="Email verified successfully.",
            data={
                "user_id": str(user.id),
                "email": user.email,
                "is_email_verified": True,
                "next_step": "complete_onboarding",
                "tokens": tokens,
            },
        )


class EmailVerificationResendAPIView(APIView):
    permission_classes = [AllowAny]
    authentication_classes = []

    def post(self, request):
        serializer = (
            EmailVerificationResendSerializer(
                data=request.data,
            )
        )
        serializer.is_valid(
            raise_exception=True,
        )

        email = serializer.validated_data["email"]

        user = get_user_by_email(
            email=email,
        )

        if (
            user is not None
            and not user.is_email_verified
        ):
            issue_email_verification_challenge(
                user=user,
            )

        return SuccessResponse(
            message=(
                "If an unverified account exists for "
                "that email, a new verification code "
                "has been sent."
            ),
            data=None,
        )