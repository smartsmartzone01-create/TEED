from decimal import Decimal

from django.db.models import Sum

from .models import Expense


def operating_expenses(*, business, month="", category=""):
    expenses = Expense.objects.select_related("recorded_by").filter(
        business=business,
        stock_receipt__isnull=True,
    )
    if month:
        year, month_number = (int(part) for part in month.split("-"))
        expenses = expenses.filter(
            incurred_at__year=year,
            incurred_at__month=month_number,
        )
    if category:
        expenses = expenses.filter(category=category)
    return expenses


def budget_financial_state(*, budget):
    actual = (
        Expense.objects.filter(
            business=budget.business,
            stock_receipt__isnull=True,
            category=budget.category,
            incurred_at__year=budget.month.year,
            incurred_at__month=budget.month.month,
        ).aggregate(total=Sum("amount"))["total"]
        or Decimal("0")
    )
    remaining = budget.planned_amount - actual
    utilization = (
        actual / budget.planned_amount * Decimal("100")
        if budget.planned_amount
        else Decimal("0")
    )
    if actual > budget.planned_amount:
        status = "over_budget"
    elif utilization >= Decimal("80"):
        status = "approaching_limit"
    else:
        status = "on_track"
    return {
        "actual_amount": actual,
        "remaining_amount": remaining,
        "utilization_percent": utilization.quantize(Decimal("0.1")),
        "status": status,
    }
