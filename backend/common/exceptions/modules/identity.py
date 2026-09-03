from rest_framework import status

from ..base import TEEDException


class EmailVerificationChallengeNotFound(TEEDException):
    default_message = "No email verification challenge was found."
    default_code = "email_verification_not_found"
    default_status_code = status.HTTP_400_BAD_REQUEST


class EmailVerificationCodeInvalid(TEEDException):
    default_message = "The email verification code is invalid."
    default_code = "email_verification_code_invalid"
    default_status_code = status.HTTP_400_BAD_REQUEST


class EmailVerificationCodeExpired(TEEDException):
    default_message = "The email verification code has expired."
    default_code = "email_verification_code_expired"
    default_status_code = status.HTTP_400_BAD_REQUEST


class EmailVerificationAttemptLimitReached(TEEDException):
    default_message = "The email verification attempt limit has been reached."
    default_code = "email_verification_attempt_limit_reached"
    default_status_code = status.HTTP_429_TOO_MANY_REQUESTS


class EmailVerificationResendCooldown(TEEDException):
    default_message = "Wait before requesting another verification code."
    default_code = "email_verification_resend_cooldown"
    default_status_code = status.HTTP_429_TOO_MANY_REQUESTS


class EmailVerificationDailyLimitReached(TEEDException):
    default_message = "The daily email verification limit has been reached."
    default_code = "email_verification_daily_limit_reached"
    default_status_code = status.HTTP_429_TOO_MANY_REQUESTS


class PhoneVerificationChallengeNotFound(TEEDException):
    default_message = "No phone verification challenge was found."
    default_code = "phone_verification_not_found"
    default_status_code = status.HTTP_400_BAD_REQUEST


class PhoneVerificationCodeInvalid(TEEDException):
    default_message = "The phone verification code is invalid."
    default_code = "phone_verification_code_invalid"
    default_status_code = status.HTTP_400_BAD_REQUEST


class PhoneVerificationCodeExpired(TEEDException):
    default_message = "The phone verification code has expired."
    default_code = "phone_verification_code_expired"
    default_status_code = status.HTTP_400_BAD_REQUEST


class PhoneVerificationAttemptLimitReached(TEEDException):
    default_message = "The phone verification attempt limit has been reached."
    default_code = "phone_verification_attempt_limit_reached"
    default_status_code = status.HTTP_429_TOO_MANY_REQUESTS


class PhoneVerificationResendCooldown(TEEDException):
    default_message = "Wait before requesting another verification code."
    default_code = "phone_verification_resend_cooldown"
    default_status_code = status.HTTP_429_TOO_MANY_REQUESTS


class PhoneVerificationDailyLimitReached(TEEDException):
    default_message = "The daily phone verification limit has been reached."
    default_code = "phone_verification_daily_limit_reached"
    default_status_code = status.HTTP_429_TOO_MANY_REQUESTS


class EmailAlreadyRegistered(TEEDException):
    default_message = "An account with this email address already exists."
    default_code = "email_already_registered"
    default_status_code = status.HTTP_409_CONFLICT


class UsernameAlreadyTaken(TEEDException):
    default_message = "This username is already in use."
    default_code = "username_already_taken"
    default_status_code = status.HTTP_409_CONFLICT


class PhoneNumberAlreadyRegistered(TEEDException):
    default_message = "This phone number is already in use."
    default_code = "phone_number_already_registered"
    default_status_code = status.HTTP_409_CONFLICT


class VerifiedPhoneChangeNotAllowed(TEEDException):
    default_message = "Use your verified phone number during onboarding. You can change it later from account security."
    default_code = "verified_phone_change_not_allowed"
    default_status_code = status.HTTP_400_BAD_REQUEST


class IdentityVerificationRequired(TEEDException):
    default_message = "Verify your email or phone number before completing onboarding."
    default_code = "identity_verification_required"
    default_status_code = status.HTTP_403_FORBIDDEN


class OnboardingAlreadyCompleted(TEEDException):
    default_message = "Onboarding has already been completed."
    default_code = "onboarding_already_completed"
    default_status_code = status.HTTP_409_CONFLICT


class InvalidCredentials(TEEDException):
    default_message = "The provided credentials are invalid."
    default_code = "invalid_credentials"
    default_status_code = status.HTTP_401_UNAUTHORIZED


class EmailVerificationRequired(TEEDException):
    default_message = "Verify your email address before signing in."
    default_code = "email_verification_required"
    default_status_code = status.HTTP_403_FORBIDDEN


class PhoneVerificationRequired(TEEDException):
    default_message = "Verify your phone number before signing in."
    default_code = "phone_verification_required"
    default_status_code = status.HTTP_403_FORBIDDEN


class SessionInvalid(TEEDException):
    default_message = "The session is invalid or no longer active."
    default_code = "session_invalid"
    default_status_code = status.HTTP_401_UNAUTHORIZED


class SessionExpired(TEEDException):
    default_message = "The session has expired. Sign in again."
    default_code = "session_expired"
    default_status_code = status.HTTP_401_UNAUTHORIZED


class RefreshTokenInvalid(TEEDException):
    default_message = "The refresh credential is invalid."
    default_code = "refresh_token_invalid"
    default_status_code = status.HTTP_401_UNAUTHORIZED


class RefreshTokenReuseDetected(TEEDException):
    default_message = "The session was revoked because credential reuse was detected."
    default_code = "refresh_token_reuse_detected"
    default_status_code = status.HTTP_401_UNAUTHORIZED


class PasswordResetChallengeInvalid(TEEDException):
    default_message = "The password reset code is invalid or has expired."
    default_code = "password_reset_challenge_invalid"
    default_status_code = status.HTTP_400_BAD_REQUEST


class PasswordResetAttemptLimitReached(TEEDException):
    default_message = "The password reset attempt limit has been reached."
    default_code = "password_reset_attempt_limit_reached"
    default_status_code = status.HTTP_429_TOO_MANY_REQUESTS


class PasswordResetGrantInvalid(TEEDException):
    default_message = "The password reset authorization is invalid or has expired."
    default_code = "password_reset_grant_invalid"
    default_status_code = status.HTTP_401_UNAUTHORIZED


class PasswordResetPasswordUnchanged(TEEDException):
    default_message = "Choose a password different from your current password."
    default_code = "password_reset_password_unchanged"
    default_status_code = status.HTTP_400_BAD_REQUEST
