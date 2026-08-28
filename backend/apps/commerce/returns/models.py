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
    return_number = models.CharField(max_length=48, blank=True, default="")
    return_sequence = models.PositiveBigIntegerField(default=0)
    resolution = models.CharField(max_length=16, choices=Resolution.choices)
    total = models.DecimalField(max_digits=14, decimal_places=2, default=0)
    refund_amount = models.DecimalField(max_digits=14, decimal_places=2, default=0)
    credit_amount = models.DecimalField(max_digits=14, decimal_places=2, default=0)
    recovered_inventory_cost = models.DecimalField(
        max_digits=14, decimal_places=2, default=0
    )
    damaged_loss = models.DecimalField(max_digits=14, decimal_places=2, default=0)
    replacement_cost = models.DecimalField(max_digits=14, decimal_places=2, default=0)
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


class ReturnReplacement(BaseModel):
    class Source(models.TextChoices):
        STOCK = "stock", "From stock"
        INDEPENDENT = "independent", "Independent"

    return_record = models.OneToOneField(
        SaleReturn, on_delete=models.CASCADE, related_name="replacement"
    )
    source = models.CharField(max_length=16, choices=Source.choices)
    product = models.ForeignKey(
        "commerce.Product",
        on_delete=models.PROTECT,
        related_name="return_replacements",
        null=True,
        blank=True,
    )
    tracked_unit = models.ForeignKey(
        "commerce.TrackedUnit",
        on_delete=models.PROTECT,
        related_name="return_replacements",
        null=True,
        blank=True,
    )
    item_name = models.CharField(max_length=160, blank=True, default="")
    item_details = models.JSONField(default=dict, blank=True)
    quantity = models.DecimalField(max_digits=14, decimal_places=3)
    acquisition_unit_cost = models.DecimalField(
        max_digits=14, decimal_places=2, null=True, blank=True
    )
    cost_total = models.DecimalField(max_digits=14, decimal_places=2, default=0)

    class Meta:
        db_table = "commerce_return_replacements"


class ReturnReplacementAllocation(BaseModel):
    replacement = models.ForeignKey(
        ReturnReplacement, on_delete=models.CASCADE, related_name="allocations"
    )
    batch = models.ForeignKey(
        "commerce.StockBatch",
        on_delete=models.PROTECT,
        related_name="return_replacement_allocations",
    )
    quantity = models.DecimalField(max_digits=14, decimal_places=3)
    unit_cost = models.DecimalField(max_digits=14, decimal_places=2)

    class Meta:
        db_table = "commerce_return_replacement_allocations"
