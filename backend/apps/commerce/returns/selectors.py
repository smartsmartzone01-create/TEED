from ..sales.models import Sale


def returnable_sales_for_period(*, business, sold_from=None, sold_before=None):
    sales = Sale.objects.filter(business=business, status=Sale.Status.ACTIVE)
    if sold_from is not None:
        sales = sales.filter(sold_at__gte=sold_from)
    if sold_before is not None:
        sales = sales.filter(sold_at__lt=sold_before)
    return (
        sales.select_related(
            "recorded_by",
            "trade_in_detail",
            "trade_in_detail__stock_product",
            "trade_in_detail__stock_receipt",
        )
        .prefetch_related("items__product", "items__tracked_unit__identifiers")
        .order_by("-sold_at", "-created_at")[:100]
    )


__all__ = ["returnable_sales_for_period"]
