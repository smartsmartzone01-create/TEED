from datetime import date
from types import SimpleNamespace
from unittest.mock import Mock, patch

from django.test import SimpleTestCase

from .branding import KUZA_AI_NAME
from .context import IntelligenceContext
from .prompts import build_partner_system_prompt
from .services import run_kuza_ai


class KuzaAIBrandingTests(SimpleTestCase):
    def test_partner_prompt_identifies_kuza_ai(self):
        context = IntelligenceContext(
            business_id="business-1",
            business_name="Duka Demo",
            locale="sw",
            timezone_name="Africa/Dar_es_Salaam",
            local_date=date(2026, 9, 4),
        )

        prompt = build_partner_system_prompt(context)

        self.assertIn(KUZA_AI_NAME, prompt)
        self.assertIn("Tunakuza's intelligent business partner", prompt)


class KuzaAIRunServiceTests(SimpleTestCase):
    def test_run_kuza_ai_reuses_authorized_context_tools_and_agent(self):
        user = object()
        business = SimpleNamespace(id="business-1", name="Duka Demo")
        membership = SimpleNamespace(business=business, role="owner")
        context = IntelligenceContext(
            business_id="business-1",
            business_name="Duka Demo",
            locale="en",
            timezone_name="Africa/Dar_es_Salaam",
            local_date=date(2026, 9, 4),
        )
        tools = Mock()
        agent = Mock()
        agent.run.return_value = SimpleNamespace(
            content="Sales are healthy today.",
            usage={"total_tokens": 42},
        )

        with patch(
            "apps.intelligence.services.commerce_membership",
            return_value=membership,
        ) as membership_service, patch(
            "apps.intelligence.services.build_intelligence_context",
            return_value=context,
        ) as context_builder, patch(
            "apps.intelligence.services.build_commerce_tool_registry",
            return_value=tools,
        ) as tool_builder, patch(
            "apps.intelligence.services.build_agent",
            return_value=agent,
        ) as agent_builder:
            result = run_kuza_ai(
                user=user,
                business_id="business-1",
                message="How is my business doing today?",
                requested_locale="en",
            )

        membership_service.assert_called_once_with(
            user=user,
            business_id="business-1",
        )
        context_builder.assert_called_once_with(
            membership=membership,
            requested_locale="en",
        )
        tool_builder.assert_called_once_with(
            membership=membership,
            context=context,
        )
        agent_builder.assert_called_once_with(
            tools=tools,
            provider_name=None,
        )
        messages = agent.run.call_args.kwargs["messages"]
        self.assertEqual(messages[-1]["content"], "How is my business doing today?")
        self.assertIn(KUZA_AI_NAME, messages[0]["content"])
        self.assertEqual(result.reply, "Sales are healthy today.")
        self.assertEqual(result.locale, "en")
        self.assertEqual(result.usage, {"total_tokens": 42})
