from unittest.mock import Mock

from django.test import SimpleTestCase, override_settings

from .exceptions import IntelligenceConfigurationError, ToolCallLimitExceeded
from .orchestration import AgentOrchestrator
from .providers.base import ProviderResponse, ToolCall
from .providers.groq import GroqProvider
from .tools import AgentTool, ToolRegistry


class GroqProviderConfigurationTests(SimpleTestCase):
    @override_settings(GROQ_API_KEY="")
    def test_provider_requires_api_key(self):
        with self.assertRaises(IntelligenceConfigurationError):
            GroqProvider.from_settings()


@override_settings(AI_ENABLED=True, AI_MAX_TOOL_CALLS=3)
class AgentOrchestratorTests(SimpleTestCase):
    def test_agent_executes_registered_tool_then_returns_final_answer(self):
        provider = Mock()
        provider.generate.side_effect = [
            ProviderResponse(
                message={
                    "role": "assistant",
                    "content": None,
                    "tool_calls": [
                        {
                            "id": "call-1",
                            "type": "function",
                            "function": {
                                "name": "business.summary",
                                "arguments": "{}",
                            },
                        }
                    ],
                },
                tool_calls=(
                    ToolCall(
                        id="call-1",
                        name="business.summary",
                        arguments={},
                    ),
                ),
                usage={"total_tokens": 10},
            ),
            ProviderResponse(
                message={"role": "assistant", "content": "Biashara iko sawa."},
                content="Biashara iko sawa.",
                usage={"total_tokens": 5},
            ),
        ]
        tools = ToolRegistry(
            [
                AgentTool(
                    name="business.summary",
                    description="Return a verified business summary.",
                    input_schema={"type": "object", "properties": {}},
                    handler=lambda: {"sales": 1000},
                )
            ]
        )

        result = AgentOrchestrator(provider=provider, tools=tools).run(
            messages=[{"role": "user", "content": "Biashara inaendeleaje?"}]
        )

        self.assertEqual(result.content, "Biashara iko sawa.")
        self.assertEqual(result.usage["total_tokens"], 15)
        self.assertEqual(result.messages[-2]["role"], "tool")
        self.assertIn('"sales": 1000', result.messages[-2]["content"])

    def test_agent_enforces_tool_call_limit(self):
        provider = Mock()
        response = ProviderResponse(
            message={"role": "assistant", "content": None},
            tool_calls=(ToolCall(id="call-1", name="noop", arguments={}),),
        )
        provider.generate.return_value = response
        tools = ToolRegistry(
            [
                AgentTool(
                    name="noop",
                    description="No-op.",
                    input_schema={"type": "object", "properties": {}},
                    handler=lambda: {},
                )
            ]
        )

        with self.assertRaises(ToolCallLimitExceeded):
            AgentOrchestrator(
                provider=provider,
                tools=tools,
                max_tool_calls=0,
            ).run(messages=[{"role": "user", "content": "test"}])
