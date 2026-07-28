from django.conf import settings

from ..email import DeliveryMessage
from ..models import EmailDelivery


def render_email_delivery(*, delivery: EmailDelivery, payload: dict):
    if delivery.template == EmailDelivery.Template.EMAIL_VERIFICATION:
        code = payload["code"]
        return DeliveryMessage(
            subject="Verify your TEED email",
            body=(
                f"Your TEED verification code is {code}.\n\n"
                f"This code expires in {settings.EMAIL_VERIFICATION_TTL_MINUTES} minutes."
            ),
            recipient=delivery.user.email,
        )
    if delivery.template == EmailDelivery.Template.PASSWORD_RESET:
        code = payload["code"]
        return DeliveryMessage(
            subject="Reset your TEED password",
            body=(
                f"Your TEED password reset code is {code}.\n\n"
                f"This code expires in {settings.EMAIL_VERIFICATION_TTL_MINUTES} minutes."
            ),
            recipient=delivery.user.email,
        )
    if delivery.template == EmailDelivery.Template.PASSWORD_CHANGED:
        return DeliveryMessage(
            subject="Your TEED password was changed",
            body=(
                "Your TEED password was changed. If this was not you, "
                "start account recovery and contact support immediately."
            ),
            recipient=delivery.user.email,
        )
    raise ValueError("Unsupported email template.")
