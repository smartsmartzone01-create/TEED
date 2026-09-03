from datetime import timedelta
from decimal import Decimal

from django.db.models import DecimalField, ExpressionWrapper, F, Q, Sum, Value
from django.db.models.functions import Coalesce

from ..inventory.models import StockBatch, StockReceipt
from .models import Budget, Expense


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


def normalize_budget_period_start(*, period_type, period_start):
    if period_type == Budget.PeriodType.WEEKLY:
        return period_start - timedelta(days=period_start.weekday())
    if period_type == Budget.PeriodType.MONTHLY:
        return period_start.replace(day=1)
    return period_start


def budget_period_bounds(*, period_type, period_start):
    start = normalize_budget_period_start(
        period_type=period_type,
        period_start=period_start,
    )
    if period_type == Budget.PeriodType.DAILY:
        end = start + timedelta(days=1)
    elif period_type == Budget.PeriodType.WEEKLY:
        end = start + timedelta(days=7)
    else:
        end = (
            start.replace(year=start.year + 1, month=1)
            if start.month == 12
            else start.replace(month=start.month + 1)
        )
    return start, end


def _operating_expense_spend(*, business, start, end):
    return Expense.objects.filter(
        business=business,
        stock_receipt__isnull=True,
        incurred_at__date__gte=start,
        incurred_at__date__lt=end,
    ).aggregate(total=Sum("amount"))["total"] or Decimal("0")


def _stock_purchase_spend(*, business, start, end):
    line_value = ExpressionWrapper(
        F("quantity_received") * Coalesce(F("unit_cost"), Value(Decimal("0.00"))),
        output_field=DecimalField(max_digits=20, decimal_places=2),
    )
    batches = StockBatch.objects.filter(
        product__business=business,
        received_at__date__gte=start,
        received_at__date__lt=end,
    ).filter(
        Q(receipt__isnull=True)
        | Q(
            receipt__status__in=[
                StockReceipt.Status.RECEIVED,
                StockReceipt.Status.ARCHIVED,
            ]
        )
    )
    batch_totals = batches.aggregate(
        buying=Sum(line_value),
        line_additional=Sum("additional_cost"),
    )
    receipt_additional = StockReceipt.objects.filter(
        business=business,
        status__in=[
            StockReceipt.Status.RECEIVED,
            StockReceipt.Status.ARCHIVED,
        ],
        received_at__date__gte=start,
        received_at__date__lt=end,
    ).aggregate(total=Sum("additional_cost"))["total"] or Decimal("0")
    return (
        (batch_totals["buying"] or Decimal("0"))
        + (batch_totals["line_additional"] or Decimal("0"))
        + receipt_additional
    )


def budget_financial_state(*, budget):
    if budget.period_start is None:
        return {
            "operating_expenses": Decimal("0"),
            "stock_purchases": Decimal("0"),
            "actual_amount": Decimal("0"),
            "remaining_amount": budget.planned_amount,
            "utilization_percent": Decimal("0.0"),
            "status": "on_track",
        }

    start, end = budget_period_bounds(
        period_type=budget.period_type,
        period_start=budget.period_start,
    )
    expense_spend = _operating_expense_spend(
        business=budget.business,
        start=start,
        end=end,
    )
    stock_spend = (
        _stock_purchase_spend(
            business=budget.business,
            start=start,
            end=end,
        )
        if budget.period_type == Budget.PeriodType.MONTHLY
        else Decimal("0")
    )
    actual = expense_spend + stock_spend
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
        "operating_expenses": expense_spend,
        "stock_purchases": stock_spend,
        "actual_amount": actual,
        "remaining_amount": remaining,
        "utilization_percent": utilization.quantize(Decimal("0.1")),
        "status": status,
    }
