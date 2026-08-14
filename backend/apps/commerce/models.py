from common.database.base_model import BaseModel
from django.conf import settings
from django.db import models


class Product(BaseModel):
    class TrackingMode(models.TextChoices):
        QUANTITY = "quantity", "Quantity"
        INDIVIDUAL = "individual", "Individual items"

    business = models.ForeignKey(
        "workspaces.Business", on_delete=models.CASCADE, related_name="products"
    )
    name = models.CharField(max_length=120)
    sku = models.CharField(max_length=64, blank=True, default="", editable=False)
    barcode = models.CharField(max_length=80, blank=True, default="")
    group = models.CharField(max_length=80, blank=True, default="")
    brand = models.CharField(max_length=80, blank=True, default="")
    variant = models.CharField(max_length=120, blank=True, default="")
    unit = models.CharField(max_length=32, default="item")
    selling_price = models.DecimalField(
        max_digits=14, decimal_places=2, null=True, blank=True
    )
    tracking_mode = models.CharField(
        max_length=16, choices=TrackingMode.choices, default=TrackingMode.QUANTITY
    )
    low_stock_threshold = models.DecimalField(
        max_digits=14, decimal_places=3, default=0
    )
    current_quantity = models.DecimalField(max_digits=14, decimal_places=3, default=0)
    is_active = models.BooleanField(default=True, db_index=True)

    class Meta:
        db_table = "commerce_products"
        ordering = ["name", "variant", "id"]
        constraints = [
            models.UniqueConstraint(
                fields=["business", "sku"],
                condition=~models.Q(sku=""),
                name="commerce_business_sku_unique",
            ),
            models.UniqueConstraint(
                fields=["business", "barcode"],
                condition=~models.Q(barcode=""),
                name="commerce_business_barcode_unique",
            ),
            models.CheckConstraint(
                condition=models.Q(selling_price__isnull=True)
                | models.Q(selling_price__gte=0),
                name="commerce_product_price_nonnegative",
            ),
            models.CheckConstraint(
                condition=models.Q(current_quantity__gte=0),
                name="commerce_product_stock_nonnegative",
            ),
        ]


class StockReceipt(BaseModel):
    class Status(models.TextChoices):
        DRAFT = "draft", "Draft"
        RECEIVED = "received", "Received"
        ARCHIVED = "archived", "Archived"

    business = models.ForeignKey(
        "workspaces.Business", on_delete=models.PROTECT, related_name="stock_receipts"
    )
    reference = models.CharField(max_length=40)
    sequence = models.PositiveBigIntegerField()
    status = models.CharField(
        max_length=12, choices=Status.choices, default=Status.DRAFT, db_index=True
    )
    supplier_name = models.CharField(max_length=120, blank=True, default="")
    supplier_reference = models.CharField(max_length=80, blank=True, default="")
    additional_cost = models.DecimalField(max_digits=14, decimal_places=2, default=0)
    notes = models.CharField(max_length=300, blank=True, default="")
    received_at = models.DateTimeField(null=True, blank=True)
    recorded_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name="recorded_stock_receipts",
    )

    class Meta:
        db_table = "commerce_stock_receipts"
        ordering = ["-created_at"]
        constraints = [
            models.UniqueConstraint(
                fields=["business", "reference"],
                name="commerce_stock_receipt_reference_unique",
            ),
            models.UniqueConstraint(
                fields=["business", "sequence"],
                name="commerce_stock_receipt_sequence_unique",
            ),
            models.CheckConstraint(
                condition=models.Q(additional_cost__gte=0),
                name="commerce_stock_receipt_cost_nonnegative",
            ),
        ]


class StockBatch(BaseModel):
    receipt = models.ForeignKey(
        StockReceipt,
        on_delete=models.PROTECT,
        related_name="lines",
        null=True,
        blank=True,
    )
    product = models.ForeignKey(
        Product, on_delete=models.PROTECT, related_name="stock_batches"
    )
    reference = models.CharField(max_length=64, blank=True, default="")
    quantity_received = models.DecimalField(max_digits=14, decimal_places=3)
    quantity_remaining = models.DecimalField(max_digits=14, decimal_places=3)
    unit_cost = models.DecimalField(
        max_digits=14, decimal_places=2, null=True, blank=True
    )
    received_unit = models.CharField(max_length=32, blank=True, default="")
    conversion_to_base = models.DecimalField(max_digits=14, decimal_places=6, default=1)
    additional_cost = models.DecimalField(max_digits=14, decimal_places=2, default=0)
    received_at = models.DateTimeField()
    supplier_name = models.CharField(max_length=120, blank=True, default="")
    recorded_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name="recorded_stock_batches",
    )

    class Meta:
        db_table = "commerce_stock_batches"
        ordering = ["received_at", "created_at"]
        constraints = [
            models.CheckConstraint(
                condition=models.Q(quantity_received__gt=0),
                name="commerce_batch_received_positive",
            ),
            models.CheckConstraint(
                condition=models.Q(quantity_remaining__gte=0),
                name="commerce_batch_remaining_nonnegative",
            ),
            models.CheckConstraint(
                condition=models.Q(unit_cost__isnull=True) | models.Q(unit_cost__gte=0),
                name="commerce_batch_cost_nonnegative",
            ),
            models.CheckConstraint(
                condition=models.Q(conversion_to_base__gt=0),
                name="commerce_batch_conversion_positive",
            ),
        ]


class TrackedUnit(BaseModel):
    class Status(models.TextChoices):
        AVAILABLE = "available", "Available"
        SOLD = "sold", "Sold"
        DAMAGED = "damaged", "Damaged"
        LOST = "lost", "Lost"

    stock_line = models.ForeignKey(
        StockBatch, on_delete=models.PROTECT, related_name="tracked_units"
    )
    product = models.ForeignKey(
        Product, on_delete=models.PROTECT, related_name="tracked_units"
    )
    internal_serial = models.CharField(max_length=40)
    imei = models.CharField(max_length=80, blank=True, default="")
    serial_number = models.CharField(max_length=120, blank=True, default="")
    condition = models.CharField(max_length=40, blank=True, default="")
    status = models.CharField(
        max_length=16, choices=Status.choices, default=Status.AVAILABLE, db_index=True
    )

    class Meta:
        db_table = "commerce_tracked_units"
        ordering = ["internal_serial"]
        constraints = [
            models.UniqueConstraint(
                fields=["product", "internal_serial"],
                name="commerce_product_internal_serial_unique",
            ),
            models.UniqueConstraint(
                fields=["product", "imei"],
                condition=~models.Q(imei=""),
                name="commerce_product_imei_unique",
            ),
            models.UniqueConstraint(
                fields=["product", "serial_number"],
                condition=~models.Q(serial_number=""),
                name="commerce_product_serial_unique",
            ),
        ]


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
    sale = models.ForeignKey(Sale, on_delete=models.CASCADE, related_name="items")
    product = models.ForeignKey(
        Product, on_delete=models.PROTECT, related_name="sale_items"
    )
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
        StockBatch, on_delete=models.PROTECT, related_name="sale_allocations"
    )
    quantity = models.DecimalField(max_digits=14, decimal_places=3)
    unit_cost = models.DecimalField(max_digits=14, decimal_places=2)

    class Meta:
        db_table = "commerce_sale_allocations"


class InventoryMovement(BaseModel):
    class Kind(models.TextChoices):
        RECEIPT = "receipt", "Stock receipt"
        SALE = "sale", "Sale"
        RETURN = "return", "Customer return"
        DAMAGE = "damage", "Damaged"
        LOSS = "loss", "Lost or stolen"
        EXPIRED = "expired", "Expired"
        CORRECTION = "correction", "Counting correction"
        INTERNAL_USE = "internal_use", "Internal use"
        GIVEAWAY = "giveaway", "Giveaway"

    business = models.ForeignKey(
        "workspaces.Business",
        on_delete=models.PROTECT,
        related_name="inventory_movements",
    )
    product = models.ForeignKey(
        Product, on_delete=models.PROTECT, related_name="movements"
    )
    batch = models.ForeignKey(
        StockBatch,
        on_delete=models.PROTECT,
        related_name="movements",
        null=True,
        blank=True,
    )
    sale = models.ForeignKey(
        Sale,
        on_delete=models.PROTECT,
        related_name="inventory_movements",
        null=True,
        blank=True,
    )
    kind = models.CharField(max_length=24, choices=Kind.choices)
    quantity_delta = models.DecimalField(max_digits=14, decimal_places=3)
    reason = models.CharField(max_length=240, blank=True, default="")
    occurred_at = models.DateTimeField()
    recorded_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name="inventory_movements",
    )

    class Meta:
        db_table = "commerce_inventory_movements"
        ordering = ["-occurred_at", "-created_at"]


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


class Expense(BaseModel):
    business = models.ForeignKey(
        "workspaces.Business", on_delete=models.PROTECT, related_name="expenses"
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


class CommerceDecision(BaseModel):
    class Severity(models.TextChoices):
        INFO = "info", "Information"
        ATTENTION = "attention", "Attention"
        URGENT = "urgent", "Urgent"

    business = models.ForeignKey(
        "workspaces.Business",
        on_delete=models.CASCADE,
        related_name="commerce_decisions",
    )
    key = models.CharField(max_length=80)
    severity = models.CharField(max_length=16, choices=Severity.choices)
    title = models.CharField(max_length=160)
    explanation = models.CharField(max_length=320)
    action_path = models.CharField(max_length=200, blank=True, default="")
    context = models.JSONField(default=dict, blank=True)
    resolved_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = "commerce_decisions"
        ordering = ["resolved_at", "-created_at"]
        constraints = [
            models.UniqueConstraint(
                fields=["business", "key"], name="commerce_decision_key_unique"
            )
        ]
