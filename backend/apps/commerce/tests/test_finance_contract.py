from datetime import date, datetime
from decimal import Decimal

from django.test import TestCase
from django.utils import timezone

from apps.identity.models import User
from apps.workspaces.models import Business, BusinessMembership

from ..catalog.models import Product
from ..finance.models import Budget, Expense
from ..finance.selectors import budget_financial_state
from ..finance.serializers import ExpenseCreateSerializer
from ..finance.services import create_expense, set_budget, update_expense
from ..inventory.models import StockBatch, StockReceipt


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

    def test_expense_edit_preserves_audit_number_and_updates_financial_reality(self):
        expense = create_expense(
            actor=self.owner,
            business_id=self.business.id,
            category=Expense.Category.TRANSPORT_TRAVEL,
            description="Fuel estimate",
            amount=Decimal("50000"),
            payee="Fuel station",
            payment_method=Expense.PaymentMethod.CASH,
            reference="",
            notes="",
            incurred_at=timezone.now(),
        )

        updated = update_expense(
            actor=self.owner,
            business_id=self.business.id,
            expense_id=expense.id,
            category=Expense.Category.TRANSPORT_TRAVEL,
            description="Fuel receipt corrected",
            amount=Decimal("47000"),
            payee="Fuel station",
            payment_method=Expense.PaymentMethod.MOBILE_MONEY,
            reference="MPESA-8891",
            notes="Corrected from receipt",
            incurred_at=expense.incurred_at,
        )

        self.assertEqual(updated.id, expense.id)
        self.assertEqual(updated.expense_number, "EXP-000001")
        self.assertEqual(updated.amount, Decimal("47000"))
        self.assertEqual(updated.reference, "MPESA-8891")
        self.assertEqual(updated.payment_method, Expense.PaymentMethod.MOBILE_MONEY)

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

    def test_budget_updates_same_period_instead_of_duplicating(self):
        first = set_budget(
            actor=self.owner,
            business_id=self.business.id,
            period_type=Budget.PeriodType.MONTHLY,
            period_start=date(2026, 8, 20),
            planned_amount=Decimal("500000"),
            notes="Initial plan",
        )
        second = set_budget(
            actor=self.owner,
            business_id=self.business.id,
            period_type=Budget.PeriodType.MONTHLY,
            period_start=date(2026, 8, 1),
            planned_amount=Decimal("650000"),
            notes="Revised plan",
        )

        self.assertEqual(first.id, second.id)
        self.assertEqual(Budget.objects.filter(business=self.business).count(), 1)
        second.refresh_from_db()
        self.assertEqual(second.period_start, date(2026, 8, 1))
        self.assertEqual(second.planned_amount, Decimal("650000"))
        self.assertEqual(second.notes, "Revised plan")

    def test_weekly_budget_normalizes_to_monday(self):
        budget = set_budget(
            actor=self.owner,
            business_id=self.business.id,
            period_type=Budget.PeriodType.WEEKLY,
            period_start=date(2026, 8, 27),
            planned_amount=Decimal("100000"),
        )

        self.assertEqual(budget.period_start, date(2026, 8, 24))

    def test_daily_budget_uses_operating_expenses_only(self):
        tz = timezone.get_current_timezone()
        Expense.objects.create(
            business=self.business,
            category=Expense.Category.TRANSPORT_TRAVEL,
            description="Delivery fuel",
            amount=Decimal("82000"),
            incurred_at=datetime(2026, 8, 15, 9, 0, tzinfo=tz),
            recorded_by=self.owner,
        )
        budget = Budget.objects.create(
            business=self.business,
            period_type=Budget.PeriodType.DAILY,
            period_start=date(2026, 8, 15),
            planned_amount=Decimal("100000"),
        )

        state = budget_financial_state(budget=budget)

        self.assertEqual(state["operating_expenses"], Decimal("82000"))
        self.assertEqual(state["stock_purchases"], Decimal("0"))
        self.assertEqual(state["actual_amount"], Decimal("82000"))
        self.assertEqual(state["remaining_amount"], Decimal("18000"))
        self.assertEqual(state["status"], "approaching_limit")

    def test_monthly_budget_includes_expenses_and_stock_acquisition_spend(self):
        tz = timezone.get_current_timezone()
        Expense.objects.create(
            business=self.business,
            category=Expense.Category.RENT,
            description="Office rent",
            amount=Decimal("82000"),
            incurred_at=datetime(2026, 8, 15, 9, 0, tzinfo=tz),
            recorded_by=self.owner,
        )
        product = Product.objects.create(
            business=self.business,
            name="Charger",
            unit="piece",
        )
        receipt = StockReceipt.objects.create(
            business=self.business,
            reference="MZIGO-000001",
            sequence=1,
            status=StockReceipt.Status.RECEIVED,
            additional_cost=Decimal("5000"),
            received_at=datetime(2026, 8, 20, 10, 0, tzinfo=tz),
            recorded_by=self.owner,
        )
        StockBatch.objects.create(
            receipt=receipt,
            product=product,
            quantity_received=Decimal("10"),
            quantity_remaining=Decimal("10"),
            unit_cost=Decimal("6000"),
            received_at=receipt.received_at,
            recorded_by=self.owner,
        )
        budget = Budget.objects.create(
            business=self.business,
            period_type=Budget.PeriodType.MONTHLY,
            period_start=date(2026, 8, 1),
            planned_amount=Decimal("200000"),
        )

        state = budget_financial_state(budget=budget)

        self.assertEqual(state["operating_expenses"], Decimal("82000"))
        self.assertEqual(state["stock_purchases"], Decimal("65000"))
        self.assertEqual(state["actual_amount"], Decimal("147000"))
        self.assertEqual(state["remaining_amount"], Decimal("53000"))
        self.assertEqual(state["status"], "on_track")
