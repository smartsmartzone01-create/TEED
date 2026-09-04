import json
from dataclasses import dataclass

from django.conf import settings

from ..exceptions import IntelligenceDisabledError, ToolCallLimitExceeded
from ..tools import ToolRegistry


@dataclass(frozen=True)
class AgentResult:
    content: str
    messages: tuple[dict, ...]
    usage: dict[str, int]


class AgentOrchestrator:
    def __init__(self, *, provider, tools=None, max_tool_calls=None):
        self.provider = provider
        self.tools = tools or ToolRegistry()
        self.max_tool_calls = (
            max_tool_calls
            if max_tool_calls is not None
            else settings.AI_MAX_TOOL_CALLS
        )

    def run(self, *, messages):
        if not settings.AI_ENABLED:
            raise IntelligenceDisabledError("Tunakuza Intelligence is disabled.")

        transcript = [dict(message) for message in messages]
        total_usage = {}
        executed_tool_calls = 0

        while True:
            response = self.provider.generate(
                messages=transcript,
                tools=self.tools.definitions(),
            )
            transcript.append(response.message)
            for key, value in response.usage.items():
                total_usage[key] = total_usage.get(key, 0) + value

            if not response.tool_calls:
                return AgentResult(
                    content=response.content,
                    messages=tuple(transcript),
                    usage=total_usage,
                )

            for tool_call in response.tool_calls:
                executed_tool_calls += 1
                if executed_tool_calls > self.max_tool_calls:
                    raise ToolCallLimitExceeded(
                        "Tunakuza Intelligence exceeded its tool-call limit."
                    )
                result = self.tools.execute(tool_call.name, tool_call.arguments)
                transcript.append(
                    {
                        "role": "tool",
                        "tool_call_id": tool_call.id,
                        "name": tool_call.name,
                        "content": json.dumps(
                            result,
                            ensure_ascii=False,
                            default=str,
                        ),
                    }
                )
