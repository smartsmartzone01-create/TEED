from datetime import date
from decimal import Decimal
from types import SimpleNamespace
from unittest.mock import Mock, patch

from django.test import SimpleTestCase, override_settings

from .context import IntelligenceContext
from .exceptions import (
    IntelligenceConfigurationError,
    InvalidToolArgumentsError,
    ToolCallLimitExceeded,
)
from .orchestration import AgentOrchestrator
from .prompts import build_partner_system_prompt
from .providers.base import ProviderResponse, ToolCall
from .providers.groq import GroqProvider
from .serializers import PartnerRequestSerializer
from .tools import AgentTool, ToolRegistry, build_commerce_tool_registry


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
                                "name": "business_summary",
                                "arguments": "{}",
                            },
                        }
                    ],
                },
                tool_calls=(
                    ToolCall(
                        id="call-1",
                        name="business_summary",
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
                    name="business_summary",
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


class ToolRegistryTests(SimpleTestCase):
    def test_registry_rejects_provider_incompatible_tool_name(self):
        with self.assertRaises(ValueError):
            ToolRegistry(
                [
                    AgentTool(
                        name="business.summary",
                        description="Invalid dotted name.",
                        input_schema={"type": "object", "properties": {}},
                        handler=lambda: {},
                    )
                ]
            )


class PartnerRequestSerializerTests(SimpleTestCase):
    def test_serializer_accepts_supported_swahili_locale(self):
        serializer = PartnerRequestSerializer(
            data={"message": "Biashara yangu inaendeleaje?", "locale": "sw"}
        )

        self.assertTrue(serializer.is_valid())
        self.assertEqual(serializer.validated_data["locale"], "sw")


class PartnerPromptTests(SimpleTestCase):
    def test_prompt_uses_workspace_context_and_swahili(self):
        context = IntelligenceContext(
            business_id="business-1",
            business_name="Duka Demo",
            locale="sw",
            timezone_name="Africa/Dar_es_Salaam",
            local_date=date(2026, 9, 4),
        )

        prompt = build_partner_system_prompt(context)

        self.assertIn("Duka Demo", prompt)
        self.assertIn("2026-09-04", prompt)
        self.assertIn("Kiswahili (Tanzania)", prompt)
        self.assertIn("source of truth", prompt)


class CommerceToolRegistryTests(SimpleTestCase):
    def setUp(self):
        self.business = SimpleNamespace(id="business-1", name="Duka Demo")
        self.membership = SimpleNamespace(business=self.business, role="member")
        self.context = IntelligenceContext(
            business_id="business-1",
            business_name="Duka Demo",
            locale="en",
            timezone_name="Africa/Dar_es_Salaam",
            local_date=date(2026, 9, 4),
        )

    def test_registry_exposes_only_server_scoped_read_only_commerce_tools(self):
        with patch(
            "apps.intelligence.tools.commerce.role_has_permission",
            return_value=False,
        ):
            registry = build_commerce_tool_registry(
                membership=self.membership,
                context=self.context,
            )

        names = {
            definition["function"]["name"] for definition in registry.definitions()
        }
        self.assertEqual(
            names,
            {
                "commerce_business_pulse",
                "commerce_sales_summary",
                "commerce_inventory_health",
            },
        )
        for definition in registry.definitions():
            self.assertNotIn(
                "business_id",
                definition["function"]["parameters"].get("properties", {}),
            )

    def test_sales_tool_redacts_finance_fields_without_permission(self):
        summary = {
            "period": {"start_date": "2026-09-01", "end_date": "2026-09-04"},
            "sales_count": 2,
            "gross_revenue": Decimal("120.00"),
            "returned_revenue": Decimal("20.00"),
            "net_revenue": Decimal("100.00"),
            "cost_of_goods": Decimal("60.00"),
            "gross_profit": Decimal("40.00"),
        }
        with patch(
            "apps.intelligence.tools.commerce.role_has_permission",
            return_value=False,
        ), patch(
            "apps.intelligence.tools.commerce.sales_summary",
            return_value=summary,
        ) as sales_selector:
            registry = build_commerce_tool_registry(
                membership=self.membership,
                context=self.context,
            )
            result = registry.execute(
                "commerce_sales_summary",
                {"start_date": "2026-09-01", "end_date": "2026-09-04"},
            )

        sales_selector.assert_called_once_with(
            business=self.business,
            start_date=date(2026, 9, 1),
            end_date=date(2026, 9, 4),
        )
        self.assertNotIn("cost_of_goods", result)
        self.assertNotIn("gross_profit", result)
        self.assertFalse(result["finance_detail_available"])

    def test_sales_tool_preserves_finance_fields_with_permission(self):
        summary = {
            "period": {"start_date": "2026-09-04", "end_date": "2026-09-04"},
            "sales_count": 1,
            "gross_revenue": Decimal("100.00"),
            "returned_revenue": Decimal("0.00"),
            "net_revenue": Decimal("100.00"),
            "cost_of_goods": Decimal("50.00"),
            "gross_profit": Decimal("50.00"),
        }
        with patch(
            "apps.intelligence.tools.commerce.role_has_permission",
            return_value=True,
        ), patch(
            "apps.intelligence.tools.commerce.sales_summary",
            return_value=summary,
        ):
            registry = build_commerce_tool_registry(
                membership=self.membership,
                context=self.context,
            )
            result = registry.execute(
                "commerce_sales_summary",
                {"start_date": "2026-09-04", "end_date": "2026-09-04"},
            )

        self.assertEqual(result["cost_of_goods"], Decimal("50.00"))
        self.assertEqual(result["gross_profit"], Decimal("50.00"))
        self.assertTrue(result["finance_detail_available"])

    def test_sales_tool_rejects_invalid_period(self):
        with patch(
            "apps.intelligence.tools.commerce.role_has_permission",
            return_value=False,
        ):
            registry = build_commerce_tool_registry(
                membership=self.membership,
                context=self.context,
            )

        with self.assertRaises(InvalidToolArgumentsError):
            registry.execute(
                "commerce_sales_summary",
                {"start_date": "2026-09-05", "end_date": "2026-09-04"},
            )
