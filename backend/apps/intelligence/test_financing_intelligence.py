from datetime import date
from decimal import Decimal
from types import SimpleNamespace
from unittest.mock import Mock, patch

from django.test import SimpleTestCase

from apps.commerce.financing.models import FinancingAgreement
from apps.commerce.financing.selectors import financing_portfolio_summary
from apps.workspaces.policy import WorkspacePermission

from .context import IntelligenceContext
from .tools import build_commerce_tool_registry


class FinancingPortfolioSelectorTests(SimpleTestCase):
    def test_summary_calculates_effective_due_and_overdue_portfolio_state(self):
        business = object()
        agreements = [
            {
                "agreement_type": FinancingAgreement.AgreementType.INSTALLMENT,
                "financing_mode": FinancingAgreement.FinancingMode.BUSINESS,
                "status": FinancingAgreement.Status.ACTIVE,
                "contract_total": Decimal("1000.00"),
                "upfront_cash": Decimal("100.00"),
                "trade_in_credit": Decimal("50.00"),
                "installment_amount": Decimal("300.00"),
                "next_due_date": date(2026, 9, 5),
                "product_released_at": None,
                "payments_total": Decimal("200.00"),
            },
            {
                "agreement_type": FinancingAgreement.AgreementType.LOAN,
                "financing_mode": FinancingAgreement.FinancingMode.PARTNER,
                "status": FinancingAgreement.Status.ACTIVE,
                "contract_total": Decimal("500.00"),
                "upfront_cash": Decimal("0.00"),
                "trade_in_credit": Decimal("0.00"),
                "installment_amount": Decimal("100.00"),
                "next_due_date": date(2026, 9, 4),
                "product_released_at": object(),
                "payments_total": Decimal("100.00"),
            },
            {
                "agreement_type": FinancingAgreement.AgreementType.LOAN,
                "financing_mode": FinancingAgreement.FinancingMode.BUSINESS,
                "status": FinancingAgreement.Status.ACTIVE,
                "contract_total": Decimal("250.00"),
                "upfront_cash": Decimal("0.00"),
                "trade_in_credit": Decimal("0.00"),
                "installment_amount": Decimal("50.00"),
                "next_due_date": date(2026, 9, 10),
                "product_released_at": object(),
                "payments_total": Decimal("250.00"),
            },
        ]
        queryset = Mock()
        queryset.annotate.return_value.values.return_value = agreements

        with patch(
            "apps.commerce.financing.selectors.FinancingAgreement.objects.filter",
            return_value=queryset,
        ) as agreement_filter:
            result = financing_portfolio_summary(
                business=business,
                as_of_date=date(2026, 9, 5),
            )

        agreement_filter.assert_called_once_with(business=business)
        self.assertEqual(result["agreement_count"], 3)
        self.assertEqual(result["status_counts"]["due"], 1)
        self.assertEqual(result["status_counts"]["overdue"], 1)
        self.assertEqual(result["status_counts"]["paid"], 1)
        self.assertEqual(result["agreement_type_counts"], {"loan": 2, "installment": 1})
        self.assertEqual(result["financing_mode_counts"], {"business": 2, "partner": 1})
        self.assertEqual(result["open_portfolio"]["agreement_count"], 2)
        self.assertEqual(result["open_portfolio"]["contract_total"], Decimal("1500.00"))
        self.assertEqual(
            result["open_portfolio"]["outstanding_balance"], Decimal("1050.00")
        )
        self.assertEqual(
            result["open_portfolio"]["outstanding_by_type"],
            {"loan": Decimal("400.00"), "installment": Decimal("650.00")},
        )
        self.assertEqual(result["open_portfolio"]["due_today_count"], 1)
        self.assertEqual(
            result["open_portfolio"]["due_today_amount"], Decimal("300.00")
        )
        self.assertEqual(result["open_portfolio"]["overdue_count"], 1)
        self.assertEqual(
            result["open_portfolio"]["overdue_outstanding_balance"], Decimal("400.00")
        )
        self.assertEqual(
            result["open_portfolio"]["overdue_outstanding_percent"], Decimal("38.10")
        )
        self.assertEqual(
            result["open_portfolio"]["installments_awaiting_release_count"], 1
        )
        self.assertEqual(
            result["open_portfolio"]["next_upcoming_due_date"], "2026-09-05"
        )
        self.assertEqual(
            result["open_portfolio"]["oldest_overdue_date"], "2026-09-04"
        )


class FinancingIntelligenceToolTests(SimpleTestCase):
    def setUp(self):
        self.business = SimpleNamespace(id="business-1", name="Duka Demo")
        self.membership = SimpleNamespace(business=self.business, role="member")
        self.context = IntelligenceContext(
            business_id="business-1",
            business_name="Duka Demo",
            locale="en",
            timezone_name="Africa/Dar_es_Salaam",
            local_date=date(2026, 9, 5),
        )

    def test_financing_tool_is_exposed_with_view_financing_permission(self):
        summary = {"as_of_date": "2026-09-05", "agreement_count": 2}

        def permission_check(_role, permission):
            return permission == WorkspacePermission.VIEW_FINANCING

        with patch(
            "apps.intelligence.tools.commerce.role_has_permission",
            side_effect=permission_check,
        ), patch(
            "apps.intelligence.tools.commerce.financing_portfolio_summary",
            return_value=summary,
        ) as selector:
            registry = build_commerce_tool_registry(
                membership=self.membership,
                context=self.context,
            )
            definitions = registry.definitions()
            names = {definition["function"]["name"] for definition in definitions}
            financing_definition = next(
                definition
                for definition in definitions
                if definition["function"]["name"] == "commerce_financing_summary"
            )
            result = registry.execute("commerce_financing_summary", {})

        self.assertIn("commerce_financing_summary", names)
        description = financing_definition["function"]["description"]
        self.assertIn("do not describe every open agreement as active", description)
        self.assertIn("product has not yet been released to the customer", description)
        selector.assert_called_once_with(
            business=self.business,
            as_of_date=date(2026, 9, 5),
        )
        self.assertEqual(result, summary)

    def test_financing_tool_is_hidden_without_view_financing_permission(self):
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
        self.assertNotIn("commerce_financing_summary", names)
