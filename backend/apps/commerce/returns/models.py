from common.database.base_model import BaseModel
from django.conf import settings
from django.db import models

from ..sales.models import Sale, SaleItem


class SaleReturn(BaseModel):
    class Resolution(models.TextChoices):
        REFUND = "refund", "Refund"
        REPLACEMENT = "replacement", "Replacement"
        CREDIT = "credit", "Store credit"

    sale = models.ForeignKey(Sale, on_delete=models.PROTECT, related_name="returns")
    resolution = models.CharField(max_length=16, choices=Resolution.choices)
    total = models.DecimalField(max_digits=14, decimal_places=2, default=0)
    reason = models.CharField(max_length=240)
    returned_at = models.DateTimeField()
    recorded_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name="recorded_returns",
    )

    class Meta:
        db_table = "commerce_returns"
        ordering = ["-returned_at"]


class ReturnItem(BaseModel):
    return_record = models.ForeignKey(
        SaleReturn, on_delete=models.CASCADE, related_name="items"
    )
    sale_item = models.ForeignKey(
        SaleItem, on_delete=models.PROTECT, related_name="return_items"
    )
    quantity = models.DecimalField(max_digits=14, decimal_places=3)
    condition = models.CharField(
        max_length=16, choices=[("sellable", "Sellable"), ("damaged", "Damaged")]
    )
    amount = models.DecimalField(max_digits=14, decimal_places=2)
    cost_total = models.DecimalField(max_digits=14, decimal_places=2, default=0)

    class Meta:
        db_table = "commerce_return_items"
