import json
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen

from django.conf import settings

from ..exceptions import IntelligenceConfigurationError, ProviderRequestError
from .base import IntelligenceProvider, ProviderResponse, ToolCall


class GroqProvider(IntelligenceProvider):
    def __init__(
        self,
        *,
        api_key,
        model,
        base_url,
        timeout_seconds,
        max_output_tokens,
        reasoning_effort,
    ):
        self.api_key = api_key
        self.model = model
        self.base_url = base_url.rstrip("/")
        self.timeout_seconds = timeout_seconds
        self.max_output_tokens = max_output_tokens
        self.reasoning_effort = reasoning_effort

    @classmethod
    def from_settings(cls):
        api_key = settings.GROQ_API_KEY.strip()
        if not api_key:
            raise IntelligenceConfigurationError(
                "GROQ_API_KEY is required when AI_PROVIDER=groq."
            )
        return cls(
            api_key=api_key,
            model=settings.GROQ_MODEL,
            base_url=settings.GROQ_API_BASE_URL,
            timeout_seconds=settings.GROQ_TIMEOUT_SECONDS,
            max_output_tokens=settings.AI_MAX_OUTPUT_TOKENS,
            reasoning_effort=settings.AI_REASONING_EFFORT,
        )

    def generate(self, *, messages, tools=()):
        payload = {
            "model": self.model,
            "messages": list(messages),
            "max_completion_tokens": self.max_output_tokens,
            "reasoning_effort": self.reasoning_effort,
            "reasoning_format": "hidden",
        }
        if tools:
            payload["tools"] = list(tools)
            payload["tool_choice"] = "auto"

        request = Request(
            f"{self.base_url}/chat/completions",
            data=json.dumps(payload).encode("utf-8"),
            headers={
                "Authorization": f"Bearer {self.api_key}",
                "Content-Type": "application/json",
            },
            method="POST",
        )

        try:
            with urlopen(request, timeout=self.timeout_seconds) as response:
                data = json.loads(response.read().decode("utf-8"))
        except HTTPError as exc:
            detail = exc.read().decode("utf-8", errors="replace")
            raise ProviderRequestError(
                f"Groq request failed with HTTP {exc.code}: {detail[:500]}"
            ) from exc
        except (URLError, TimeoutError, json.JSONDecodeError) as exc:
            raise ProviderRequestError("Groq request failed.") from exc

        try:
            message = data["choices"][0]["message"]
        except (KeyError, IndexError, TypeError) as exc:
            raise ProviderRequestError("Groq returned an invalid response.") from exc

        tool_calls = []
        for raw_call in message.get("tool_calls") or []:
            function = raw_call.get("function") or {}
            raw_arguments = function.get("arguments") or "{}"
            try:
                arguments = json.loads(raw_arguments)
            except json.JSONDecodeError as exc:
                raise ProviderRequestError(
                    "Groq returned invalid tool arguments."
                ) from exc
            tool_calls.append(
                ToolCall(
                    id=raw_call.get("id", ""),
                    name=function.get("name", ""),
                    arguments=arguments,
                )
            )

        usage = data.get("usage") or {}
        normalized_usage = {
            key: int(value)
            for key, value in usage.items()
            if isinstance(value, int)
        }
        return ProviderResponse(
            message=message,
            content=message.get("content") or "",
            tool_calls=tuple(tool_calls),
            usage=normalized_usage,
        )
