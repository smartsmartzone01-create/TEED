import base64
import json
from hashlib import sha256

from cryptography.fernet import Fernet, InvalidToken
from django.conf import settings


class DeliveryPayloadInvalid(Exception):
    pass


def _fernet() -> Fernet:
    configured_key = settings.EMAIL_DELIVERY_ENCRYPTION_KEY.strip()
    if configured_key:
        key = configured_key.encode("ascii")
    else:
        key = base64.urlsafe_b64encode(
            sha256(settings.SECRET_KEY.encode("utf-8")).digest()
        )
    return Fernet(key)


def encrypt_delivery_payload(payload: dict) -> str:
    serialized = json.dumps(payload, separators=(",", ":"), sort_keys=True)
    return _fernet().encrypt(serialized.encode("utf-8")).decode("ascii")


def decrypt_delivery_payload(ciphertext: str) -> dict:
    try:
        plaintext = _fernet().decrypt(ciphertext.encode("ascii"))
        value = json.loads(plaintext)
    except (InvalidToken, ValueError, TypeError, json.JSONDecodeError) as exc:
        raise DeliveryPayloadInvalid() from exc
    if not isinstance(value, dict):
        raise DeliveryPayloadInvalid()
    return value
