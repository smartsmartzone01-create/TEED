from common.database.base_model import BaseModel
from django.conf import settings
from django.db import models

from ..catalog.models import Product


class Sale(BaseModel):
    class Status(models.TextChoices):
        ACTIVE = "active", "Active"
        VOIDED = "voided", "Voided and archived"

    class SaleType(models.TextChoices):
        RETAIL = "retail", "Retail"
        WHOLESALE = "wholesale", "Wholesale"

    class PaymentStatus(models.TextChoices):
        PAID = "paid", "Paid"
        PARTIAL = "partial", "Partial"
        UNPAID = "unpaid", "Unpaid"

    business = models.ForeignKey(
        "workspaces.Business", on_delete=models.PROTECT, related_name="sales"
    )
    receipt_number = models.CharField(max_length=40)
    receipt_sequence = models.PositiveBigIntegerField()
    status = models.CharField(
        max_length=12, choices=Status.choices, default=Status.ACTIVE, db_index=True
    )
    sale_type = models.CharField(
        max_length=16, choices=SaleType.choices, default=SaleType.RETAIL
    )
    customer_name = models.CharField(max_length=120, blank=True, default="")
    customer_phone = models.CharField(max_length=32, blank=True, default="")
    customer_region = models.CharField(max_length=120, blank=True, default="")
    subtotal = models.DecimalField(max_digits=14, decimal_places=2, default=0)
    discount = models.DecimalField(max_digits=14, decimal_places=2, default=0)
    total = models.DecimalField(max_digits=14, decimal_places=2, default=0)
    cost_of_goods = models.DecimalField(max_digits=14, decimal_places=2, default=0)
    payment_status = models.CharField(
        max_length=16, choices=PaymentStatus.choices, default=PaymentStatus.PAID
    )
    sold_at = models.DateTimeField()
    recorded_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name="recorded_sales",
    )
    voided_at = models.DateTimeField(null=True, blank=True)
    voided_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name="voided_sales",
        null=True,
        blank=True,
    )
    void_reason = models.CharField(max_length=240, blank=True, default="")

    class Meta:
        db_table = "commerce_sales"
        ordering = ["-sold_at", "-created_at"]
        constraints = [
            models.UniqueConstraint(
                fields=["business", "receipt_number"], name="commerce_receipt_unique"
            ),
            models.UniqueConstraint(
                fields=["business", "receipt_sequence"],
                name="commerce_receipt_sequence_unique",
            ),
        ]


class SaleAudit(BaseModel):
    sale = models.ForeignKey(
        Sale, on_delete=models.PROTECT, related_name="audit_events"
    )
    actor = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT)
    action = models.CharField(
        max_length=16, choices=[("edit", "Edit"), ("void", "Void")]
    )
    before = models.JSONField(default=dict)
    after = models.JSONField(default=dict)

    class Meta:
        db_table = "commerce_sale_audit"
        ordering = ["-created_at"]


class SaleItem(BaseModel):
    class Source(models.TextChoices):
        CATALOG = "catalog", "TEED product / SKU"
        MANUAL = "manual", "Manual item"

    sale = models.ForeignKey(Sale, on_delete=models.CASCADE, related_name="items")
    source = models.CharField(
        max_length=12, choices=Source.choices, default=Source.CATALOG
    )
    product = models.ForeignKey(
        Product,
        on_delete=models.PROTECT,
        related_name="sale_items",
        null=True,
        blank=True,
    )
    tracked_unit = models.ForeignKey(
        "commerce.TrackedUnit",
        on_delete=models.PROTECT,
        related_name="sale_items",
        null=True,
        blank=True,
    )
    item_name = models.CharField(max_length=160, blank=True, default="")
    quantity = models.DecimalField(max_digits=14, decimal_places=3)
    unit_price = models.DecimalField(max_digits=14, decimal_places=2)
    line_total = models.DecimalField(max_digits=14, decimal_places=2)
    cost_total = models.DecimalField(max_digits=14, decimal_places=2, default=0)
    returned_quantity = models.DecimalField(max_digits=14, decimal_places=3, default=0)

    class Meta:
        db_table = "commerce_sale_items"


class SaleAllocation(BaseModel):
    sale_item = models.ForeignKey(
        SaleItem, on_delete=models.CASCADE, related_name="allocations"
    )
    batch = models.ForeignKey(
        "commerce.StockBatch", on_delete=models.PROTECT, related_name="sale_allocations"
    )
    quantity = models.DecimalField(max_digits=14, decimal_places=3)
    unit_cost = models.DecimalField(max_digits=14, decimal_places=2)

    class Meta:
        db_table = "commerce_sale_allocations"
