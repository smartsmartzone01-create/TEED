from datetime import date
from decimal import Decimal

from django.test import TestCase
from django.utils import timezone

from apps.identity.models import User
from apps.workspaces.models import Business, BusinessMembership

from ..finance.models import Budget, Expense
from ..finance.selectors import budget_financial_state
from ..finance.serializers import ExpenseCreateSerializer
from ..finance.services import create_expense, set_budget


class FinanceContractTests(TestCase):
    def setUp(self):
        self.owner = User.objects.create_user(
            email="finance-contract@example.com",
            password="Strong-Password-123!",
        )
        self.owner.is_email_verified = True
        self.owner.save()
        self.business = Business.objects.create(
            name="Finance Contract Business",
            public_handle="finance-contract",
            country_code="TZ",
            workspace_type=Business.WorkspaceType.BUSINESS,
            created_by=self.owner,
        )
        BusinessMembership.objects.create(
            business=self.business,
            user=self.owner,
            role="owner",
        )

    def test_operating_expense_records_financial_details_and_number(self):
        expense = create_expense(
            actor=self.owner,
            business_id=self.business.id,
            category=Expense.Category.RENT,
            description="August office rent",
            amount=Decimal("450000"),
            payee="Building owner",
            payment_method=Expense.PaymentMethod.BANK_TRANSFER,
            reference="BANK-8891",
            notes="Main office",
            incurred_at=timezone.now(),
        )

        self.assertEqual(expense.expense_number, "EXP-000001")
        self.assertEqual(expense.category, Expense.Category.RENT)
        self.assertEqual(expense.amount, Decimal("450000"))
        self.assertEqual(expense.payee, "Building owner")
        self.assertEqual(expense.reference, "BANK-8891")

    def test_manual_expense_cannot_use_internal_stock_expense_category(self):
        serializer = ExpenseCreateSerializer(
            data={
                "category": Expense.Category.STOCK_EXPENSE,
                "description": "Do not duplicate stock cost",
                "amount": "1000.00",
                "payment_method": Expense.PaymentMethod.CASH,
                "incurred_at": timezone.now().isoformat(),
            }
        )

        self.assertFalse(serializer.is_valid())
        self.assertIn("category", serializer.errors)

    def test_budget_updates_same_category_and_month_instead_of_duplicating(self):
        first = set_budget(
            actor=self.owner,
            business_id=self.business.id,
            category=Expense.Category.MARKETING_ADVERTISING,
            month=date(2026, 8, 20),
            planned_amount=Decimal("500000"),
            notes="Initial plan",
        )
        second = set_budget(
            actor=self.owner,
            business_id=self.business.id,
            category=Expense.Category.MARKETING_ADVERTISING,
            month=date(2026, 8, 1),
            planned_amount=Decimal("650000"),
            notes="Revised plan",
        )

        self.assertEqual(first.id, second.id)
        self.assertEqual(Budget.objects.filter(business=self.business).count(), 1)
        second.refresh_from_db()
        self.assertEqual(second.planned_amount, Decimal("650000"))
        self.assertEqual(second.notes, "Revised plan")

    def test_budget_actual_comes_from_recorded_operating_expenses(self):
        budget = Budget.objects.create(
            business=self.business,
            category=Expense.Category.TRANSPORT_TRAVEL,
            month=date(2026, 8, 1),
            planned_amount=Decimal("100000"),
        )
        Expense.objects.create(
            business=self.business,
            category=Expense.Category.TRANSPORT_TRAVEL,
            description="Delivery fuel",
            amount=Decimal("82000"),
            incurred_at=timezone.datetime(2026, 8, 15, 9, 0, tzinfo=timezone.get_current_timezone()),
            recorded_by=self.owner,
        )
        Expense.objects.create(
            business=self.business,
            category=Expense.Category.TRANSPORT_TRAVEL,
            description="Older trip",
            amount=Decimal("20000"),
            incurred_at=timezone.datetime(2026, 7, 31, 9, 0, tzinfo=timezone.get_current_timezone()),
            recorded_by=self.owner,
        )

        state = budget_financial_state(budget=budget)

        self.assertEqual(state["actual_amount"], Decimal("82000"))
        self.assertEqual(state["remaining_amount"], Decimal("18000"))
        self.assertEqual(state["utilization_percent"], Decimal("82.0"))
        self.assertEqual(state["status"], "approaching_limit")
