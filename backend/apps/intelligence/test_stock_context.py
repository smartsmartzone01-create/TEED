from datetime import date
from types import SimpleNamespace
from unittest.mock import Mock, patch

from django.test import SimpleTestCase

from apps.workspaces.policy import WorkspacePermission

from .context import IntelligenceContext
from .serializers import PartnerRequestSerializer
from .services import run_kuza_ai
from .tools import build_commerce_tool_registry


class KuzaConversationContextTests(SimpleTestCase):
    def test_partner_request_accepts_bounded_history(self):
        serializer = PartnerRequestSerializer(
            data={
                "message": "give me the total cost of that mzigo",
                "locale": "en",
                "history": [
                    {"role": "user", "content": "overview of BATCH 1"},
                    {
                        "role": "assistant",
                        "content": "BATCH 1 is MZIGO-000003.",
                    },
                ],
            }
        )

        self.assertTrue(serializer.is_valid(), serializer.errors)
        self.assertEqual(len(serializer.validated_data["history"]), 2)

    @patch("apps.intelligence.services.commerce_membership")
    @patch("apps.intelligence.services.build_intelligence_context")
    @patch("apps.intelligence.services.build_commerce_tool_registry")
    @patch("apps.intelligence.services.build_agent")
    def test_run_kuza_ai_passes_recent_history_before_current_message(
        self,
        build_agent,
        build_registry,
        build_context,
        commerce_membership,
    ):
        membership = SimpleNamespace(business=SimpleNamespace(id="business-1"), role="owner")
        context = IntelligenceContext(
            business_id="business-1",
            business_name="Duka Demo",
            locale="en",
            timezone_name="Africa/Dar_es_Salaam",
            local_date=date(2026, 9, 7),
            role="owner",
            permissions=(WorkspacePermission.MANAGE_FINANCE.value,),
        )
        agent = Mock()
        agent.run.return_value = SimpleNamespace(
            content="verified answer",
            usage={"total_tokens": 1},
        )
        commerce_membership.return_value = membership
        build_context.return_value = context
        build_registry.return_value = Mock()
        build_agent.return_value = agent

        run_kuza_ai(
            user=object(),
            business_id="business-1",
            message="give me the total cost of that mzigo",
            history=[
                {"role": "user", "content": "overview of BATCH 1"},
                {"role": "assistant", "content": "BATCH 1 is MZIGO-000003."},
            ],
        )

        messages = agent.run.call_args.kwargs["messages"]
        self.assertEqual(messages[-3]["content"], "overview of BATCH 1")
        self.assertEqual(messages[-2]["content"], "BATCH 1 is MZIGO-000003.")
        self.assertEqual(messages[-1]["content"], "give me the total cost of that mzigo")


class KuzaStockPermissionTests(SimpleTestCase):
    def setUp(self):
        self.business = SimpleNamespace(id="business-1", name="Duka Demo")

    def _context(self, *, role, permissions=()):
        return IntelligenceContext(
            business_id="business-1",
            business_name="Duka Demo",
            locale="en",
            timezone_name="Africa/Dar_es_Salaam",
            local_date=date(2026, 9, 7),
            role=role,
            permissions=permissions,
        )

    def test_owner_receipt_detail_includes_verified_stock_costs(self):
        membership = SimpleNamespace(business=self.business, role="owner")
        detail = {"found": True, "reference": "MZIGO-000003"}
        costs = {
            "found": True,
            "reference": "MZIGO-000003",
            "merchandise_cost": "1000.00",
            "stock_expenses": "100.00",
            "landed_total": "1100.00",
        }

        def permission_check(_role, permission):
            return permission == WorkspacePermission.MANAGE_FINANCE

        with patch(
            "apps.intelligence.tools.commerce.role_has_permission",
            side_effect=permission_check,
        ), patch(
            "apps.intelligence.tools.commerce.stock_receipt_detail",
            return_value=detail,
        ), patch(
            "apps.intelligence.tools.commerce.stock_receipt_cost_detail",
            return_value=costs,
        ) as cost_selector:
            registry = build_commerce_tool_registry(
                membership=membership,
                context=self._context(
                    role="owner",
                    permissions=(WorkspacePermission.MANAGE_FINANCE.value,),
                ),
            )
            result = registry.execute(
                "commerce_stock_receipt_detail",
                {"reference": "MZIGO-000003"},
            )

        self.assertTrue(result["finance_detail_available"])
        self.assertEqual(result["finance"], costs)
        cost_selector.assert_called_once_with(
            business=self.business,
            reference="MZIGO-000003",
        )

    def test_member_receipt_detail_explains_permission_denial(self):
        membership = SimpleNamespace(business=self.business, role="member")
        detail = {"found": True, "reference": "MZIGO-000003"}

        with patch(
            "apps.intelligence.tools.commerce.role_has_permission",
            return_value=False,
        ), patch(
            "apps.intelligence.tools.commerce.stock_receipt_detail",
            return_value=detail,
        ), patch(
            "apps.intelligence.tools.commerce.stock_receipt_cost_detail",
        ) as cost_selector:
            registry = build_commerce_tool_registry(
                membership=membership,
                context=self._context(role="member"),
            )
            result = registry.execute(
                "commerce_stock_receipt_detail",
                {"reference": "MZIGO-000003"},
            )

        self.assertFalse(result["finance_detail_available"])
        self.assertEqual(result["finance_detail_reason"]["code"], "permission_denied")
        self.assertEqual(result["finance_detail_reason"]["current_role"], "member")
        self.assertEqual(
            result["finance_detail_reason"]["required_permission"],
            WorkspacePermission.MANAGE_FINANCE.value,
        )
        cost_selector.assert_not_called()
