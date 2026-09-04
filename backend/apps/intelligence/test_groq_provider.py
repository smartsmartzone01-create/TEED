from unittest.mock import Mock, patch

from django.test import SimpleTestCase

from .providers.groq import GroqProvider


class GroqProviderTransportTests(SimpleTestCase):
    def test_generate_uses_official_sdk_and_preserves_provider_contract(self):
        client = Mock()
        completion = Mock()
        completion.model_dump.return_value = {
            "choices": [
                {
                    "message": {
                        "role": "assistant",
                        "content": None,
                        "tool_calls": [
                            {
                                "id": "call-1",
                                "type": "function",
                                "function": {
                                    "name": "business_summary",
                                    "arguments": '{"days": 1}',
                                },
                            }
                        ],
                    }
                }
            ],
            "usage": {
                "prompt_tokens": 4,
                "completion_tokens": 3,
                "total_tokens": 7,
            },
        }
        client.chat.completions.create.return_value = completion
        tool_definition = {
            "type": "function",
            "function": {
                "name": "business_summary",
                "description": "Return a business summary.",
                "parameters": {
                    "type": "object",
                    "properties": {},
                    "additionalProperties": False,
                },
            },
        }
        provider = GroqProvider(
            api_key="test-key",
            model="openai/gpt-oss-120b",
            base_url="https://api.groq.com/openai/v1",
            timeout_seconds=30,
            max_output_tokens=2000,
            reasoning_effort="medium",
        )
        messages = [{"role": "user", "content": "How is business?"}]

        with patch(
            "apps.intelligence.providers.groq.Groq",
            return_value=client,
        ) as groq_client:
            result = provider.generate(
                messages=messages,
                tools=(tool_definition,),
            )

        groq_client.assert_called_once_with(
            api_key="test-key",
            base_url="https://api.groq.com",
            timeout=30,
            max_retries=0,
        )
        client.chat.completions.create.assert_called_once_with(
            model="openai/gpt-oss-120b",
            messages=messages,
            max_completion_tokens=2000,
            reasoning_effort="medium",
            include_reasoning=False,
            tools=[tool_definition],
            tool_choice="auto",
        )
        self.assertEqual(result.content, "")
        self.assertEqual(result.usage["total_tokens"], 7)
        self.assertEqual(len(result.tool_calls), 1)
        self.assertEqual(result.tool_calls[0].name, "business_summary")
        self.assertEqual(result.tool_calls[0].arguments, {"days": 1})
