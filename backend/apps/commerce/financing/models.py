from common.database.base_model import BaseModel
from django.conf import settings
from django.db import models

from ..catalog.models import Product


def financing_document_upload_path(instance, filename):
    safe_name = filename.rsplit("/", 1)[-1].rsplit("\\", 1)[-1]
    return f"commerce/financing/{instance.agreement.business_id}/{instance.agreement_id}/{safe_name}"


class FinancingAgreement(BaseModel):
    class AgreementType(models.TextChoices):
        LOAN = "loan", "Loan"
        INSTALLMENT = "installment", "Installment purchase"

    class TransactionType(models.TextChoices):
        NORMAL = "normal", "Normal"
        UPFRONT = "upfront", "Upfront payment"
        TRADE_IN = "trade_in", "Trade-in"

    class Source(models.TextChoices):
        STOCK = "stock", "From stock"
        INDEPENDENT = "independent", "Independent"

    class MarketType(models.TextChoices):
        RETAIL = "retail", "Retail"
        WHOLESALE = "wholesale", "Wholesale"

    class FinancingMode(models.TextChoices):
        BUSINESS = "business", "Business financed"
        PARTNER = "partner", "Financing partner"

    class Frequency(models.TextChoices):
        WEEKLY = "weekly", "Weekly"
        MONTHLY = "monthly", "Monthly"

    class Status(models.TextChoices):
        ACTIVE = "active", "Active"
        DUE = "due", "Due"
        OVERDUE = "overdue", "Overdue"
        PAID = "paid", "Paid"
        CANCELLED = "cancelled", "Cancelled"

    business = models.ForeignKey(
        "workspaces.Business", on_delete=models.PROTECT, related_name="financing_agreements"
    )
    reference = models.CharField(max_length=40)
    sequence = models.PositiveBigIntegerField()
    agreement_type = models.CharField(max_length=16, choices=AgreementType.choices)
    transaction_type = models.CharField(
        max_length=16, choices=TransactionType.choices, default=TransactionType.NORMAL
    )
    source = models.CharField(max_length=16, choices=Source.choices)
    market_type = models.CharField(max_length=16, choices=MarketType.choices)
    financing_mode = models.CharField(
        max_length=16, choices=FinancingMode.choices, default=FinancingMode.BUSINESS
    )
    status = models.CharField(
        max_length=16, choices=Status.choices, default=Status.ACTIVE, db_index=True
    )
    customer_name = models.CharField(max_length=120)
    customer_phone = models.CharField(max_length=32, blank=True, default="")
    customer_region = models.CharField(max_length=120, blank=True, default="")
    contract_total = models.DecimalField(max_digits=14, decimal_places=2)
    upfront_cash = models.DecimalField(max_digits=14, decimal_places=2, default=0)
    trade_in_item_name = models.CharField(max_length=160, blank=True, default="")
    trade_in_credit = models.DecimalField(max_digits=14, decimal_places=2, default=0)
    installment_amount = models.DecimalField(max_digits=14, decimal_places=2)
    frequency = models.CharField(max_length=12, choices=Frequency.choices)
    next_due_date = models.DateField(null=True, blank=True, db_index=True)
    release_threshold_percent = models.DecimalField(
        max_digits=5, decimal_places=2, default=100
    )
    product_released_at = models.DateTimeField(null=True, blank=True)
    partner_name = models.CharField(max_length=120, blank=True, default="")
    partner_settlement_amount = models.DecimalField(
        max_digits=14, decimal_places=2, null=True, blank=True
    )
    partner_settlement_received = models.BooleanField(default=False)
    business_commission = models.DecimalField(max_digits=14, decimal_places=2, default=0)
    notes = models.CharField(max_length=500, blank=True, default="")
    recorded_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name="recorded_financing_agreements",
    )

    class Meta:
        db_table = "commerce_financing_agreements"
        ordering = ["-created_at"]
        constraints = [
            models.UniqueConstraint(
                fields=["business", "reference"],
                name="commerce_financing_reference_unique",
            ),
            models.UniqueConstraint(
                fields=["business", "sequence"],
                name="commerce_financing_sequence_unique",
            ),
        ]

    @property
    def contribution_total(self):
        return self.upfront_cash + self.trade_in_credit

    @property
    def payments_total(self):
        return sum((payment.amount for payment in self.payments.all()), 0)

    @property
    def outstanding_balance(self):
        return max(0, self.contract_total - self.contribution_total - self.payments_total)


class FinancingItem(BaseModel):
    class WarrantyMonths(models.IntegerChoices):
        THREE = 3, "3 months"
        SIX = 6, "6 months"
        TWELVE = 12, "12 months"
        TWENTY_FOUR = 24, "24 months"

    agreement = models.ForeignKey(
        FinancingAgreement, on_delete=models.CASCADE, related_name="items"
    )
    product = models.ForeignKey(
        Product,
        on_delete=models.PROTECT,
        related_name="financing_items",
        null=True,
        blank=True,
    )
    tracked_unit = models.ForeignKey(
        "commerce.TrackedUnit",
        on_delete=models.PROTECT,
        related_name="financing_items",
        null=True,
        blank=True,
    )
    item_name = models.CharField(max_length=160)
    item_details = models.JSONField(default=dict, blank=True)
    quantity = models.DecimalField(max_digits=14, decimal_places=3)
    unit_price = models.DecimalField(max_digits=14, decimal_places=2)
    line_total = models.DecimalField(max_digits=14, decimal_places=2)
    acquisition_unit_cost = models.DecimalField(
        max_digits=14, decimal_places=2, null=True, blank=True
    )
    cost_total = models.DecimalField(max_digits=14, decimal_places=2, default=0)
    warranty_months = models.PositiveSmallIntegerField(
        choices=WarrantyMonths.choices, null=True, blank=True
    )

    class Meta:
        db_table = "commerce_financing_items"


class FinancingAllocation(BaseModel):
    financing_item = models.ForeignKey(
        FinancingItem, on_delete=models.CASCADE, related_name="allocations"
    )
    batch = models.ForeignKey(
        "commerce.StockBatch",
        on_delete=models.PROTECT,
        related_name="financing_allocations",
    )
    quantity = models.DecimalField(max_digits=14, decimal_places=3)
    unit_cost = models.DecimalField(max_digits=14, decimal_places=2)

    class Meta:
        db_table = "commerce_financing_allocations"


class FinancingPayment(BaseModel):
    agreement = models.ForeignKey(
        FinancingAgreement, on_delete=models.CASCADE, related_name="payments"
    )
    amount = models.DecimalField(max_digits=14, decimal_places=2)
    paid_at = models.DateTimeField()
    method = models.CharField(max_length=40, blank=True, default="")
    reference = models.CharField(max_length=80, blank=True, default="")
    recorded_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name="recorded_financing_payments",
    )

    class Meta:
        db_table = "commerce_financing_payments"
        ordering = ["-paid_at", "-created_at"]


class FinancingDocument(BaseModel):
    agreement = models.ForeignKey(
        FinancingAgreement, on_delete=models.CASCADE, related_name="documents"
    )
    file = models.FileField(upload_to=financing_document_upload_path)
    original_name = models.CharField(max_length=180)
    description = models.CharField(max_length=240, blank=True, default="")
    uploaded_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name="uploaded_financing_documents",
    )

    class Meta:
        db_table = "commerce_financing_documents"
        ordering = ["-created_at"]
