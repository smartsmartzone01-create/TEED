import json
from dataclasses import dataclass
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen

from decouple import AutoConfig
from django.conf import settings
from django.utils.module_loading import import_string


class SmsProviderError(RuntimeError):
    def __init__(self, message: str, *, code: str, permanent: bool = False):
        super().__init__(message)
        self.code = code
        self.permanent = permanent


@dataclass(frozen=True)
class SmsReceipt:
    provider_message_id: str = ""


class NextSmsProvider:
    """NEXTSMS Internet SMS transport. Credentials are loaded from the environment."""

    def __init__(self):
        config = AutoConfig(search_path=settings.BASE_DIR.parent)
        self.token = config("NEXTSMS_TOKEN", default="").strip()
        self.sender_id = config("NEXTSMS_SENDER_ID", default="MUST").strip()
        self.api_url = config(
            "NEXTSMS_API_URL",
            default="https://messaging-service.co.tz/api/sms/v2/text/single",
        ).strip()
        self.timeout = config("NEXTSMS_TIMEOUT_SECONDS", default=10, cast=int)

    def send(self, *, to: str, text: str, reference: str) -> SmsReceipt:
        if not self.token:
            raise SmsProviderError(
                "NEXTSMS token is not configured.",
                code="nextsms_not_configured",
                permanent=True,
            )

        payload = {
            "from": self.sender_id,
            "to": to.lstrip("+"),
            "text": text,
            "flash": 0,
            "reference": reference,
        }
        request = Request(
            self.api_url,
            data=json.dumps(payload).encode("utf-8"),
            method="POST",
            headers={
                "Authorization": f"Bearer {self.token}",
                "Accept": "application/json",
                "Content-Type": "application/json",
            },
        )

        try:
            with urlopen(request, timeout=self.timeout) as response:
                raw = response.read().decode("utf-8")
        except HTTPError as exc:
            permanent = 400 <= exc.code < 500 and exc.code != 429
            raise SmsProviderError(
                "NEXTSMS rejected the request.",
                code=f"nextsms_http_{exc.code}",
                permanent=permanent,
            ) from exc
        except (URLError, TimeoutError) as exc:
            raise SmsProviderError(
                "NEXTSMS could not be reached.",
                code="nextsms_unavailable",
            ) from exc

        try:
            data = json.loads(raw) if raw else {}
        except json.JSONDecodeError:
            data = {}

        message_id = ""
        if isinstance(data, dict):
            message_id = str(data.get("messageId") or data.get("message_id") or "")
            messages = data.get("messages")
            if not message_id and isinstance(messages, list) and messages:
                first = messages[0]
                if isinstance(first, dict):
                    message_id = str(
                        first.get("messageId") or first.get("message_id") or ""
                    )

        return SmsReceipt(provider_message_id=message_id)


class FakeSmsProvider:
    """Safe test provider that never performs a network request."""

    def send(self, *, to: str, text: str, reference: str) -> SmsReceipt:
        return SmsReceipt(provider_message_id=f"fake:{reference}")


def get_sms_provider():
    config = AutoConfig(search_path=settings.BASE_DIR.parent)
    provider_path = config(
        "SMS_DELIVERY_PROVIDER",
        default="apps.identity.sms.NextSmsProvider",
    )
    provider_class = import_string(provider_path)
    return provider_class()
