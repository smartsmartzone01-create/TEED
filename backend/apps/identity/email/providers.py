import json
from dataclasses import dataclass
from smtplib import SMTPRecipientsRefused
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen

from decouple import AutoConfig
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


class ResendEmailProvider:
    """Resend Email API transport; verification logic stays in Identity."""

    def __init__(self):
        config = AutoConfig(search_path=settings.BASE_DIR.parent)
        self.api_key = config("RESEND_API_KEY", default="").strip()
        self.api_url = config(
            "RESEND_API_URL",
            default="https://api.resend.com/emails",
        ).strip()
        self.timeout = config("RESEND_TIMEOUT_SECONDS", default=10, cast=int)

    def send(self, *, message: DeliveryMessage, idempotency_key: str):
        if not self.api_key:
            raise DeliveryProviderError(
                "resend_not_configured",
                permanent=True,
            )

        payload = {
            "from": settings.DEFAULT_FROM_EMAIL,
            "to": [message.recipient],
            "subject": message.subject,
            "text": message.body,
        }
        request = Request(
            self.api_url,
            data=json.dumps(payload).encode("utf-8"),
            method="POST",
            headers={
                "Authorization": f"Bearer {self.api_key}",
                "Content-Type": "application/json",
                "Idempotency-Key": idempotency_key,
                "User-Agent": "Tunakuza/1.0",
            },
        )

        try:
            with urlopen(request, timeout=self.timeout) as response:
                raw = response.read().decode("utf-8")
        except HTTPError as exc:
            permanent = 400 <= exc.code < 500 and exc.code not in {408, 429}
            raise DeliveryProviderError(
                f"resend_http_{exc.code}",
                permanent=permanent,
            ) from exc
        except (URLError, TimeoutError) as exc:
            raise DeliveryProviderError("resend_unavailable") from exc

        try:
            data = json.loads(raw) if raw else {}
        except json.JSONDecodeError as exc:
            raise DeliveryProviderError("resend_invalid_response") from exc

        message_id = str(data.get("id") or "") if isinstance(data, dict) else ""
        if not message_id:
            raise DeliveryProviderError("resend_invalid_response")

        return DeliveryReceipt(provider_message_id=message_id)
