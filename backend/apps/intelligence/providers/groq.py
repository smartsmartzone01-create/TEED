import json

from django.conf import settings
from groq import APIConnectionError, APIStatusError, APITimeoutError, Groq

from ..exceptions import IntelligenceConfigurationError, ProviderRequestError
from .base import IntelligenceProvider, ProviderResponse, ToolCall


def _sdk_base_url(base_url):
    normalized = base_url.rstrip("/")
    suffix = "/openai/v1"
    if normalized.endswith(suffix):
        return normalized[: -len(suffix)]
    return normalized


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

    def _client(self):
        return Groq(
            api_key=self.api_key,
            base_url=_sdk_base_url(self.base_url),
            timeout=self.timeout_seconds,
            max_retries=0,
        )

    def generate(self, *, messages, tools=()):
        payload = {
            "model": self.model,
            "messages": list(messages),
            "max_completion_tokens": self.max_output_tokens,
            "reasoning_effort": self.reasoning_effort,
            "include_reasoning": False,
        }
        if tools:
            payload["tools"] = list(tools)
            payload["tool_choice"] = "auto"

        try:
            completion = self._client().chat.completions.create(**payload)
            data = completion.model_dump(exclude_none=True)
        except APIStatusError as exc:
            raise ProviderRequestError(
                f"Groq request failed with HTTP {exc.status_code}."
            ) from exc
        except (APIConnectionError, APITimeoutError) as exc:
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
                arguments = (
                    raw_arguments
                    if isinstance(raw_arguments, dict)
                    else json.loads(raw_arguments)
                )
            except (TypeError, json.JSONDecodeError) as exc:
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
