from django.urls import path

from .api import (
    AdjustmentCreateAPIView,
    BudgetListCreateAPIView,
    CommerceOverviewAPIView,
    ExpenseListCreateAPIView,
    ProductListCreateAPIView,
    ReturnListCreateAPIView,
    SaleListCreateAPIView,
    StockBatchListCreateAPIView,
)

app_name = "commerce"
urlpatterns = [
    path(
        "businesses/<uuid:business_id>/overview/",
        CommerceOverviewAPIView.as_view(),
        name="overview",
    ),
    path(
        "businesses/<uuid:business_id>/products/",
        ProductListCreateAPIView.as_view(),
        name="products",
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
