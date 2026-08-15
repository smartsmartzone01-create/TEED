from django.urls import path

from .catalog.api import (
    ActiveProductListCreatePolishAPIView,
    ProductDetailOperationsPolishAPIView,
)
from .finance.api import BudgetListCreateAPIView, ExpenseListCreateAPIView
from .inventory.api import (
    ActiveStockReceiptListCreatePolishAPIView,
    AdjustmentCreateAPIView,
    GuardedStockReceiptArchiveAPIView,
    GuardedStockReceiptDetailAPIView,
    StockBatchListCreateAPIView,
    StockReceiptReceiveAPIView,
)
from .overview.api import CommerceOverviewPolishAPIView
from .returns.api import ReturnListCreateAPIView
from .sales.api import SaleDetailAPIView, SaleListCreateAPIView, SaleVoidAPIView

app_name = "commerce"
urlpatterns = [
    path(
        "businesses/<uuid:business_id>/stock-receipts/",
        ActiveStockReceiptListCreatePolishAPIView.as_view(),
        name="stock-receipts",
    ),
    path(
        "businesses/<uuid:business_id>/stock-receipts/<uuid:receipt_id>/",
        GuardedStockReceiptDetailAPIView.as_view(),
        name="stock-receipt-detail",
    ),
    path(
        "businesses/<uuid:business_id>/stock-receipts/<uuid:receipt_id>/receive/",
        StockReceiptReceiveAPIView.as_view(),
        name="stock-receipt-receive",
    ),
    path(
        "businesses/<uuid:business_id>/stock-receipts/<uuid:receipt_id>/archive/",
        GuardedStockReceiptArchiveAPIView.as_view(),
        name="stock-receipt-archive",
    ),
    path(
        "businesses/<uuid:business_id>/overview/",
        CommerceOverviewPolishAPIView.as_view(),
        name="overview",
    ),
    path(
        "businesses/<uuid:business_id>/products/",
        ActiveProductListCreatePolishAPIView.as_view(),
        name="products",
    ),
    path(
        "businesses/<uuid:business_id>/products/<uuid:product_id>/",
        ProductDetailOperationsPolishAPIView.as_view(),
        name="product-detail",
    ),
    path(
        "businesses/<uuid:business_id>/inventory/",
        StockBatchListCreateAPIView.as_view(),
        name="inventory",
    ),
    path(
        "businesses/<uuid:business_id>/inventory/adjustments/",
        AdjustmentCreateAPIView.as_view(),
        name="adjustments",
    ),
    path(
        "businesses/<uuid:business_id>/sales/",
        SaleListCreateAPIView.as_view(),
        name="sales",
    ),
    path(
        "businesses/<uuid:business_id>/sales/<uuid:sale_id>/",
        SaleDetailAPIView.as_view(),
        name="sale-detail",
    ),
    path(
        "businesses/<uuid:business_id>/sales/<uuid:sale_id>/void/",
        SaleVoidAPIView.as_view(),
        name="sale-void",
    ),
    path(
        "businesses/<uuid:business_id>/returns/",
        ReturnListCreateAPIView.as_view(),
        name="returns",
    ),
    path(
        "businesses/<uuid:business_id>/expenses/",
        ExpenseListCreateAPIView.as_view(),
        name="expenses",
    ),
    path(
        "businesses/<uuid:business_id>/budgets/",
        BudgetListCreateAPIView.as_view(),
        name="budgets",
    ),
]
