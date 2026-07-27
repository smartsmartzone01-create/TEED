from rest_framework import status

from ..base import TEEDException


class EmailVerificationChallengeNotFound(TEEDException):
    default_message = (
        "No email verification challenge was found."
    )
    default_code = "email_verification_not_found"
    default_status_code = status.HTTP_400_BAD_REQUEST


class EmailVerificationCodeInvalid(TEEDException):
    default_message = (
        "The email verification code is invalid."
    )
    default_code = "email_verification_code_invalid"
    default_status_code = status.HTTP_400_BAD_REQUEST


class EmailVerificationCodeExpired(TEEDException):
    default_message = (
        "The email verification code has expired."
    )
    default_code = "email_verification_code_expired"
    default_status_code = status.HTTP_400_BAD_REQUEST


class EmailVerificationAttemptLimitReached(
    TEEDException
):
    default_message = (
        "The email verification attempt limit "
        "has been reached."
    )
    default_code = (
        "email_verification_attempt_limit_reached"
    )
    default_status_code = (
        status.HTTP_429_TOO_MANY_REQUESTS
    )

class EmailAlreadyRegistered(TEEDException):
    default_message = (
        "An account with this email address "
        "already exists."
    )
    default_code = "email_already_registered"
    default_status_code = status.HTTP_409_CONFLICT   


class UsernameAlreadyTaken(TEEDException):
    default_message = (
        "This username is already in use."
    )
    default_code = "username_already_taken"
    default_status_code = status.HTTP_409_CONFLICT


class PhoneNumberAlreadyRegistered(TEEDException):
    default_message = (
        "This phone number is already in use."
    )
    default_code = "phone_number_already_registered"
    default_status_code = status.HTTP_409_CONFLICT


class IdentityVerificationRequired(TEEDException):
    default_message = (
        "Verify your email or phone number before "
        "completing onboarding."
    )
    default_code = "identity_verification_required"
    default_status_code = status.HTTP_403_FORBIDDEN

class OnboardingAlreadyCompleted(TEEDException):
    default_message = (
        "Onboarding has already been completed."
    )
    default_code = "onboarding_already_completed"
    default_status_code = status.HTTP_409_CONFLICT   

class InvalidCredentials(TEEDException):
    default_message = (
        "The provided credentials are invalid."
    )
    default_code = "invalid_credentials"
    default_status_code = status.HTTP_401_UNAUTHORIZED


class EmailVerificationRequired(TEEDException):
    default_message = (
        "Verify your email address before signing in."
    )
    default_code = "email_verification_required"
    default_status_code = status.HTTP_403_FORBIDDEN   