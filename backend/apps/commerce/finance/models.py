from common.database.base_model import BaseModel
from django.conf import settings
from django.db import models

from ..inventory.models import StockReceipt


class Expense(BaseModel):
    business = models.ForeignKey(
        "workspaces.Business", on_delete=models.PROTECT, related_name="expenses"
    )
    stock_receipt = models.OneToOneField(
        StockReceipt,
        on_delete=models.PROTECT,
        related_name="stock_expense",
        null=True,
        blank=True,
    )
    category = models.CharField(max_length=48)
    description = models.CharField(max_length=160)
    amount = models.DecimalField(max_digits=14, decimal_places=2)
    incurred_at = models.DateTimeField()
    recorded_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name="recorded_expenses",
    )

    class Meta:
        db_table = "commerce_expenses"
        ordering = ["-incurred_at"]


class Budget(BaseModel):
    business = models.ForeignKey(
        "workspaces.Business", on_delete=models.CASCADE, related_name="budgets"
    )
    category = models.CharField(max_length=48)
    month = models.DateField()
    planned_amount = models.DecimalField(max_digits=14, decimal_places=2)

    class Meta:
        db_table = "commerce_budgets"
        constraints = [
            models.UniqueConstraint(
                fields=["business", "category", "month"],
                name="commerce_budget_period_unique",
            )
        ]
