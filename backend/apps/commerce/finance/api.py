from decimal import Decimal

from common.responses import SuccessResponse
from django.db.models import Sum
from django.utils.decorators import method_decorator
from django.views.decorators.csrf import csrf_protect
from rest_framework import status

from apps.workspaces.policy import WorkspacePermission

from ..api import CommerceBaseAPIView
from ..services import commerce_membership
from .models import Budget
from .selectors import budget_financial_state, operating_expenses
from .serializers import (
    BudgetCreateSerializer,
    BudgetSerializer,
    ExpenseCreateSerializer,
    ExpenseListQuerySerializer,
    ExpenseSerializer,
)
from .services import create_expense, set_budget, update_expense


def _money_string(value):
    return str((value or Decimal("0")).quantize(Decimal("0.01")))


def _budget_payload(budget):
    financial_state = budget_financial_state(budget=budget)
    return {
        **BudgetSerializer(budget).data,
        "operating_expenses": _money_string(financial_state["operating_expenses"]),
        "stock_purchases": _money_string(financial_state["stock_purchases"]),
        "actual_amount": _money_string(financial_state["actual_amount"]),
        "remaining_amount": _money_string(financial_state["remaining_amount"]),
        "utilization_percent": str(financial_state["utilization_percent"]),
        "status": financial_state["status"],
    }


class ExpenseListCreateAPIView(CommerceBaseAPIView):
    def get(self, request, business_id):
        membership = commerce_membership(
            user=request.user,
            business_id=business_id,
            permission=WorkspacePermission.MANAGE_FINANCE,
        )
        query = ExpenseListQuerySerializer(data=request.query_params)
        query.is_valid(raise_exception=True)

        expenses = operating_expenses(
            business=membership.business,
            month=query.validated_data.get("month", ""),
            category=query.validated_data.get("category", ""),
        )
        total = expenses.aggregate(total=Sum("amount"))["total"] or Decimal("0")
        raw_category_totals = list(
            expenses.values("category")
            .annotate(total=Sum("amount"))
            .order_by("category")
        )
        category_totals = [
            {
                "category": row["category"],
                "total": _money_string(row["total"]),
            }
            for row in raw_category_totals
        ]
        return SuccessResponse(
            message="Expenses retrieved successfully.",
            data={
                "expenses": ExpenseSerializer(expenses[:200], many=True).data,
                "summary": {
                    "total": _money_string(total),
                    "category_totals": category_totals,
                },
            },
        )

    @method_decorator(csrf_protect)
    def post(self, request, business_id):
        serializer = ExpenseCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        expense = create_expense(
            actor=request.user,
            business_id=business_id,
            **serializer.validated_data,
        )
        return SuccessResponse(
            message="Expense recorded successfully.",
            data=ExpenseSerializer(expense).data,
            status_code=status.HTTP_201_CREATED,
        )


class ExpenseDetailAPIView(CommerceBaseAPIView):
    @method_decorator(csrf_protect)
    def patch(self, request, business_id, expense_id):
        serializer = ExpenseCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        expense = update_expense(
            actor=request.user,
            business_id=business_id,
            expense_id=expense_id,
            **serializer.validated_data,
        )
        return SuccessResponse(
            message="Expense updated successfully.",
            data=ExpenseSerializer(expense).data,
        )


class BudgetListCreateAPIView(CommerceBaseAPIView):
    def get(self, request, business_id):
        membership = commerce_membership(
            user=request.user,
            business_id=business_id,
            permission=WorkspacePermission.MANAGE_FINANCE,
        )
        budgets = Budget.objects.filter(
            business=membership.business,
            period_start__isnull=False,
        )
        return SuccessResponse(
            message="Budgets retrieved successfully.",
            data={"budgets": [_budget_payload(budget) for budget in budgets]},
        )

    @method_decorator(csrf_protect)
    def post(self, request, business_id):
        serializer = BudgetCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        budget = set_budget(
            actor=request.user,
            business_id=business_id,
            **serializer.validated_data,
        )
        return SuccessResponse(
            message="Budget saved successfully.",
            data=_budget_payload(budget),
            status_code=status.HTTP_201_CREATED,
        )


__all__ = [
    "BudgetListCreateAPIView",
    "ExpenseDetailAPIView",
    "ExpenseListCreateAPIView",
]
