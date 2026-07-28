from dataclasses import dataclass
from smtplib import SMTPRecipientsRefused

from django.conf import settings
from django.core.mail import send_mail


@dataclass(frozen=True)
class DeliveryMessage:
    subject: str
    body: str
    recipient: str


@dataclass(frozen=True)
class DeliveryReceipt:
    provider_message_id: str = ""


class DeliveryProviderError(Exception):
    def __init__(self, code: str, *, permanent: bool = False):
        super().__init__(code)
        self.code = code
        self.permanent = permanent


class DjangoEmailProvider:
    """Local/default adapter; production providers implement the same contract."""

    def send(self, *, message: DeliveryMessage, idempotency_key: str):
        try:
            sent_count = send_mail(
                subject=message.subject,
                message=message.body,
                from_email=settings.DEFAULT_FROM_EMAIL,
                recipient_list=[message.recipient],
                fail_silently=False,
            )
        except SMTPRecipientsRefused as exc:
            raise DeliveryProviderError(
                "recipient_refused",
                permanent=True,
            ) from exc
        except Exception as exc:
            raise DeliveryProviderError("provider_unavailable") from exc
        if sent_count != 1:
            raise DeliveryProviderError("provider_rejected")
        return DeliveryReceipt(provider_message_id=f"django:{idempotency_key}")
