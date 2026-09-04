from datetime import date
from decimal import Decimal
from types import SimpleNamespace
from unittest.mock import Mock, patch

from django.test import SimpleTestCase, override_settings

from apps.commerce.finance.selectors import (
    current_budget_health,
    operating_expense_summary,
)

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


class CommerceFinanceSelectorTests(SimpleTestCase):
    def test_operating_expense_summary_returns_deterministic_totals(self):
        business = object()
        expenses = Mock()
        expenses.aggregate.return_value = {"total": Decimal("150.00")}
        expenses.count.return_value = 3
        expenses.values.return_value.annotate.return_value.order_by.return_value = [
            {"category": "rent", "total": Decimal("100.00")},
            {"category": "utilities", "total": Decimal("50.00")},
        ]

        with patch(
            "apps.commerce.finance.selectors.Expense.objects.filter",
            return_value=expenses,
        ) as expense_filter:
            result = operating_expense_summary(
                business=business,
                start_date=date(2026, 9, 1),
                end_date=date(2026, 9, 4),
            )

        expense_filter.assert_called_once_with(
            business=business,
            stock_receipt__isnull=True,
            incurred_at__date__gte=date(2026, 9, 1),
            incurred_at__date__lte=date(2026, 9, 4),
        )
        self.assertEqual(result["expense_count"], 3)
        self.assertEqual(result["total"], Decimal("150.00"))
        self.assertEqual(
            result["category_totals"],
            [
                {"category": "rent", "total": Decimal("100.00")},
                {"category": "utilities", "total": Decimal("50.00")},
            ],
        )

    def test_current_budget_health_preserves_deterministic_financial_state(self):
        business = object()
        budget = SimpleNamespace(
            period_type="monthly",
            period_start=date(2026, 9, 1),
            planned_amount=Decimal("1000.00"),
        )
        budget_queryset = Mock()
        budget_queryset.filter.return_value = [budget]
        state = {
            "operating_expenses": Decimal("200.00"),
            "stock_purchases": Decimal("300.00"),
            "actual_amount": Decimal("500.00"),
            "remaining_amount": Decimal("500.00"),
            "utilization_percent": Decimal("50.0"),
            "status": "on_track",
        }

        with patch(
            "apps.commerce.finance.selectors.Budget.objects.filter",
            return_value=budget_queryset,
        ), patch(
            "apps.commerce.finance.selectors.budget_financial_state",
            return_value=state,
        ):
            result = current_budget_health(
                business=business,
                as_of_date=date(2026, 9, 4),
            )

        self.assertEqual(result["as_of_date"], "2026-09-04")
        self.assertEqual(
            result["budgets"],
            [
                {
                    "period_type": "monthly",
                    "period_start": "2026-09-01",
                    "period_end": "2026-09-30",
                    "planned_amount": Decimal("1000.00"),
                    **state,
                }
            ],
        )


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

    def test_registry_exposes_finance_tools_with_manage_finance_permission(self):
        with patch(
            "apps.intelligence.tools.commerce.role_has_permission",
            return_value=True,
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
                "commerce_financing_summary",
                "commerce_expense_summary",
                "commerce_budget_status",
            },
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

    def test_expense_tool_uses_deterministic_finance_selector(self):
        summary = {
            "period": {"start_date": "2026-09-01", "end_date": "2026-09-04"},
            "expense_count": 2,
            "total": Decimal("80.00"),
            "category_totals": [
                {"category": "rent", "total": Decimal("80.00")}
            ],
        }
        with patch(
            "apps.intelligence.tools.commerce.role_has_permission",
            return_value=True,
        ), patch(
            "apps.intelligence.tools.commerce.operating_expense_summary",
            return_value=summary,
        ) as expense_selector:
            registry = build_commerce_tool_registry(
                membership=self.membership,
                context=self.context,
            )
            result = registry.execute(
                "commerce_expense_summary",
                {"start_date": "2026-09-01", "end_date": "2026-09-04"},
            )

        expense_selector.assert_called_once_with(
            business=self.business,
            start_date=date(2026, 9, 1),
            end_date=date(2026, 9, 4),
        )
        self.assertEqual(result, summary)

    def test_budget_tool_defaults_to_workspace_local_date(self):
        summary = {"as_of_date": "2026-09-04", "budgets": []}
        with patch(
            "apps.intelligence.tools.commerce.role_has_permission",
            return_value=True,
        ), patch(
            "apps.intelligence.tools.commerce.current_budget_health",
            return_value=summary,
        ) as budget_selector:
            registry = build_commerce_tool_registry(
                membership=self.membership,
                context=self.context,
            )
            result = registry.execute("commerce_budget_status", {})

        budget_selector.assert_called_once_with(
            business=self.business,
            as_of_date=date(2026, 9, 4),
        )
        self.assertEqual(result, summary)

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
