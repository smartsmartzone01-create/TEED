from decimal import Decimal

from common.responses import SuccessResponse
from django.db.models import F, Sum
from django.utils import timezone

from apps.workspaces.policy import WorkspacePermission, role_has_permission

from ..api import CommerceBaseAPIView
from ..inventory.serializers import CanonicalStockReceiptSerializer
from ..models import (
    Expense,
    InventoryMovement,
    Product,
    ReturnItem,
    Sale,
    SaleReturn,
    StockReceipt,
)
from ..serializers import ProductSerializer, ReturnSerializer, SaleSerializer
from ..services import commerce_membership


class CommerceOverviewPolishAPIView(CommerceBaseAPIView):
    def get(self, request, business_id):
        membership = commerce_membership(user=request.user, business_id=business_id)
        business = membership.business
        today = timezone.localdate()

        today_sales = Sale.objects.filter(
            business=business,
            sold_at__date=today,
            status=Sale.Status.ACTIVE,
        )
        expenses = Expense.objects.filter(business=business, incurred_at__date=today)
        returns_today = ReturnItem.objects.filter(
            return_record__sale__business=business,
            return_record__returned_at__date=today,
        )
        totals = today_sales.aggregate(revenue=Sum("total"), cost=Sum("cost_of_goods"))
        expense_total = expenses.aggregate(total=Sum("amount"))["total"] or Decimal("0")
        return_totals = returns_today.aggregate(
            revenue=Sum("amount"), cost=Sum("cost_total")
        )
        revenue = (totals["revenue"] or Decimal("0")) - (
            return_totals["revenue"] or Decimal("0")
        )
        cost = (totals["cost"] or Decimal("0")) - (
            return_totals["cost"] or Decimal("0")
        )

        products = Product.objects.filter(business=business, is_active=True)
        stocked_products = products.filter(
            movements__kind=InventoryMovement.Kind.RECEIPT,
        ).distinct()
        sold_out_products = stocked_products.filter(current_quantity=0)
        available_products = products.filter(current_quantity__gt=0)
        low_stock_products = available_products.filter(
            low_stock_threshold__gt=0,
            current_quantity__lte=F("low_stock_threshold"),
        )
        can_manage_finance = role_has_permission(
            membership.role,
            WorkspacePermission.MANAGE_FINANCE,
        )

        def financial_value(value):
            return value if can_manage_finance else None

        stock_value = sum(
            (
                product.current_quantity
                * (
                    product.stock_batches.order_by("-received_at")
                    .values_list("unit_cost", flat=True)
                    .first()
                    or Decimal("0")
                )
            )
            for product in products
        )
        recent_sales = Sale.objects.prefetch_related("items__product").filter(
            business=business,
            status=Sale.Status.ACTIVE,
        )[:5]
        recent_stock = StockReceipt.objects.prefetch_related(
            "lines__product",
            "lines__tracked_units__identifiers",
            "batches__groups__type_lines__product",
            "batches__groups__type_lines__tracked_units__identifiers",
        ).filter(
            business=business,
            parent_receipt__isnull=True,
            status=StockReceipt.Status.RECEIVED,
        )[:5]
        recent_returns = SaleReturn.objects.select_related("sale").filter(
            sale__business=business,
        )[:5]

        return SuccessResponse(
            message="Commerce overview retrieved successfully.",
            data={
                "pulse": {
                    "revenue": revenue,
                    "cost_of_goods": financial_value(cost),
                    "gross_profit": financial_value(revenue - cost),
                    "operating_result": financial_value(
                        revenue - cost - expense_total
                    ),
                    "expenses": financial_value(expense_total),
                    "sales_count": today_sales.count(),
                    "low_stock_count": low_stock_products.count(),
                    "available_skus": available_products.count(),
                    "sold_out_skus": sold_out_products.count(),
                    "stock_value": financial_value(stock_value),
                    "confidence": "reliable",
                    "can_manage_finance": can_manage_finance,
                },
                "recent_sales": SaleSerializer(
                    recent_sales,
                    many=True,
                    context={"show_costs": can_manage_finance},
                ).data,
                "recent_stock": CanonicalStockReceiptSerializer(
                    recent_stock,
                    many=True,
                ).data,
                "recent_returns": ReturnSerializer(recent_returns, many=True).data,
                "sold_out_items": ProductSerializer(
                    sold_out_products.order_by("name", "variant", "id")[:5],
                    many=True,
                ).data,
            },
        )


__all__ = ["CommerceOverviewPolishAPIView"]
