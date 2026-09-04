from common.responses import SuccessResponse
from rest_framework.exceptions import ValidationError
from rest_framework.permissions import IsAuthenticated
from rest_framework.views import APIView

from ..serializers import (
    AccountProtectionCodeSerializer,
    AccountProtectionEmailRequestSerializer,
)
from ..services import (
    get_account_protection_recommendation,
    request_email_account_protection,
    request_phone_account_protection,
    verify_email_account_protection,
    verify_phone_account_protection,
)
from .session_cookies import get_request_session_metadata


def account_protection_data(user):
    return {
        "email": user.email,
        "phone_number": user.phone_number,
        "is_email_verified": user.is_email_verified,
        "is_phone_verified": user.is_phone_verified,
        "recommended_step": get_account_protection_recommendation(user=user),
    }


def _raise_contact_validation(exc: ValueError):
    reason = str(exc)
    messages = {
        "email_already_verified": "This email is already verified.",
        "email_change_not_allowed": (
            "Verify the email already attached to this account before changing it."
        ),
        "email_missing": "Add an email address before verification.",
        "email_required": "Enter an email address to protect your account.",
        "phone_already_verified": "This phone number is already verified.",
        "phone_missing": "Add a phone number before verification.",
    }
    field = "email" if reason.startswith("email_") else "phone_number"
    raise ValidationError({field: [messages.get(reason, "Unable to verify this contact.")]})


class AccountProtectionStatusAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        request.user.refresh_from_db()
        return SuccessResponse(
            message="Account protection status retrieved successfully.",
            data=account_protection_data(request.user),
        )


class AccountProtectionPhoneRequestAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        try:
            user = request_phone_account_protection(
                user=request.user,
                **get_request_session_metadata(request),
            )
        except ValueError as exc:
            _raise_contact_validation(exc)
        return SuccessResponse(
            message="Phone verification code sent successfully.",
            data=account_protection_data(user),
        )


class AccountProtectionPhoneVerifyAPIView(APIView):
    serializer_class = AccountProtectionCodeSerializer
    permission_classes = [IsAuthenticated]

    def post(self, request):
        serializer = self.serializer_class(data=request.data)
        serializer.is_valid(raise_exception=True)
        try:
            user = verify_phone_account_protection(
                user=request.user,
                code=serializer.validated_data["code"],
                **get_request_session_metadata(request),
            )
        except ValueError as exc:
            _raise_contact_validation(exc)
        return SuccessResponse(
            message="Phone verified successfully.",
            data=account_protection_data(user),
        )


class AccountProtectionEmailRequestAPIView(APIView):
    serializer_class = AccountProtectionEmailRequestSerializer
    permission_classes = [IsAuthenticated]

    def post(self, request):
        serializer = self.serializer_class(data=request.data)
        serializer.is_valid(raise_exception=True)
        try:
            user = request_email_account_protection(
                user=request.user,
                email=serializer.validated_data.get("email"),
                **get_request_session_metadata(request),
            )
        except ValueError as exc:
            _raise_contact_validation(exc)
        return SuccessResponse(
            message="Email verification code sent successfully.",
            data=account_protection_data(user),
        )


class AccountProtectionEmailVerifyAPIView(APIView):
    serializer_class = AccountProtectionCodeSerializer
    permission_classes = [IsAuthenticated]

    def post(self, request):
        serializer = self.serializer_class(data=request.data)
        serializer.is_valid(raise_exception=True)
        try:
            user = verify_email_account_protection(
                user=request.user,
                code=serializer.validated_data["code"],
                **get_request_session_metadata(request),
            )
        except ValueError as exc:
            _raise_contact_validation(exc)
        return SuccessResponse(
            message="Email verified successfully.",
            data=account_protection_data(user),
        )
