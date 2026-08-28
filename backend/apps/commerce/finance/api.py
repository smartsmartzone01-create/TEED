from decimal import Decimal

from common.responses import SuccessResponse
from django.db.models import Sum
from django.utils.decorators import method_decorator
from django.views.decorators.csrf import csrf_protect
from rest_framework import status

from apps.workspaces.policy import WorkspacePermission

from ..api import CommerceBaseAPIView
from ..services import commerce_membership
from .models import Budget, Expense
from .serializers import (
    BudgetCreateSerializer,
    BudgetSerializer,
    ExpenseCreateSerializer,
    ExpenseListQuerySerializer,
    ExpenseSerializer,
)
from .services import create_expense, set_budget


class ExpenseListCreateAPIView(CommerceBaseAPIView):
    def get(self, request, business_id):
        membership = commerce_membership(
            user=request.user,
            business_id=business_id,
            permission=WorkspacePermission.MANAGE_FINANCE,
        )
        query = ExpenseListQuerySerializer(data=request.query_params)
        query.is_valid(raise_exception=True)

        expenses = Expense.objects.select_related("recorded_by").filter(
            business=membership.business,
            stock_receipt__isnull=True,
        )
        month = query.validated_data.get("month")
        if month:
            year, month_number = (int(part) for part in month.split("-"))
            expenses = expenses.filter(
                incurred_at__year=year,
                incurred_at__month=month_number,
            )
        category = query.validated_data.get("category")
        if category:
            expenses = expenses.filter(category=category)

        total = expenses.aggregate(total=Sum("amount"))["total"] or Decimal("0")
        category_totals = list(
            expenses.values("category")
            .annotate(total=Sum("amount"))
            .order_by("category")
        )
        expense_rows = expenses[:200]
        return SuccessResponse(
            message="Expenses retrieved successfully.",
            data={
                "expenses": ExpenseSerializer(expense_rows, many=True).data,
                "summary": {
                    "total": total,
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


class BudgetListCreateAPIView(CommerceBaseAPIView):
    def get(self, request, business_id):
        membership = commerce_membership(
            user=request.user,
            business_id=business_id,
            permission=WorkspacePermission.MANAGE_FINANCE,
        )
        budgets = Budget.objects.filter(
            business=membership.business,
        ).exclude(category=Expense.Category.STOCK_EXPENSE)

        payload = []
        for budget in budgets:
            actual = (
                Expense.objects.filter(
                    business=membership.business,
                    stock_receipt__isnull=True,
                    category=budget.category,
                    incurred_at__year=budget.month.year,
                    incurred_at__month=budget.month.month,
                ).aggregate(total=Sum("amount"))["total"]
                or Decimal("0")
            )
            remaining = budget.planned_amount - actual
            utilization = (
                (actual / budget.planned_amount * Decimal("100"))
                if budget.planned_amount
                else Decimal("0")
            )
            if actual > budget.planned_amount:
                budget_status = "over_budget"
            elif utilization >= Decimal("80"):
                budget_status = "approaching_limit"
            else:
                budget_status = "on_track"
            payload.append(
                {
                    **BudgetSerializer(budget).data,
                    "actual_amount": actual,
                    "remaining_amount": remaining,
                    "utilization_percent": utilization.quantize(Decimal("0.1")),
                    "status": budget_status,
                }
            )

        return SuccessResponse(
            message="Budgets retrieved successfully.",
            data={"budgets": payload},
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
            data=BudgetSerializer(budget).data,
            status_code=status.HTTP_201_CREATED,
        )


__all__ = ["BudgetListCreateAPIView", "ExpenseListCreateAPIView"]
