from decimal import Decimal

from django.db.models import Sum

from ..returns.models import ReturnItem
from .models import Sale


_ZERO = Decimal("0")


def sales_summary(*, business, start_date, end_date):
    """Return deterministic sales performance for an inclusive date range."""
    sales = Sale.objects.filter(
        business=business,
        status=Sale.Status.ACTIVE,
        sold_at__date__gte=start_date,
        sold_at__date__lte=end_date,
    )
    returns = ReturnItem.objects.filter(
        return_record__sale__business=business,
        return_record__returned_at__date__gte=start_date,
        return_record__returned_at__date__lte=end_date,
    )

    sale_totals = sales.aggregate(
        revenue=Sum("total"),
        cost=Sum("cost_of_goods"),
    )
    return_totals = returns.aggregate(
        revenue=Sum("amount"),
        cost=Sum("cost_total"),
    )

    gross_revenue = sale_totals["revenue"] or _ZERO
    returned_revenue = return_totals["revenue"] or _ZERO
    gross_cost = sale_totals["cost"] or _ZERO
    returned_cost = return_totals["cost"] or _ZERO
    net_revenue = gross_revenue - returned_revenue
    net_cost = gross_cost - returned_cost

    return {
        "period": {
            "start_date": start_date.isoformat(),
            "end_date": end_date.isoformat(),
        },
        "sales_count": sales.count(),
        "gross_revenue": gross_revenue,
        "returned_revenue": returned_revenue,
        "net_revenue": net_revenue,
        "cost_of_goods": net_cost,
        "gross_profit": net_revenue - net_cost,
    }
