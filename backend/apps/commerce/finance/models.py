from common.database.base_model import BaseModel
from django.conf import settings
from django.db import models

from ..inventory.models import StockReceipt


class Expense(BaseModel):
    class Category(models.TextChoices):
        SALARIES_WAGES = "salaries_wages", "Salaries & wages"
        RENT = "rent", "Rent"
        UTILITIES = "utilities", "Utilities"
        INTERNET_PHONE = "internet_phone", "Internet & phone"
        TRANSPORT_TRAVEL = "transport_travel", "Transport & travel"
        MARKETING_ADVERTISING = "marketing_advertising", "Marketing & advertising"
        REPAIRS_MAINTENANCE = "repairs_maintenance", "Repairs & maintenance"
        SOFTWARE_SUBSCRIPTIONS = "software_subscriptions", "Software & subscriptions"
        PROFESSIONAL_SERVICES = "professional_services", "Professional services"
        BANK_PAYMENT_FEES = "bank_payment_fees", "Bank & payment fees"
        INSURANCE = "insurance", "Insurance"
        LICENSES_PERMITS = "licenses_permits", "Licenses & permits"
        OFFICE_ADMIN = "office_admin", "Office & administration"
        SECURITY_CLEANING = "security_cleaning", "Security & cleaning"
        TAXES_DUTIES = "taxes_duties", "Taxes & duties"
        INTEREST_FINANCE = "interest_finance", "Interest & finance charges"
        MEALS_HOSPITALITY = "meals_hospitality", "Meals & hospitality"
        OTHER = "other", "Other"
        STOCK_EXPENSE = "stock_expense", "Stock acquisition cost"

    class PaymentMethod(models.TextChoices):
        CASH = "cash", "Cash"
        BANK_TRANSFER = "bank_transfer", "Bank transfer"
        MOBILE_MONEY = "mobile_money", "Mobile money"
        CARD = "card", "Card"
        CHEQUE = "cheque", "Cheque"
        OTHER = "other", "Other"

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
    expense_number = models.CharField(max_length=40, blank=True, default="")
    category = models.CharField(max_length=48, choices=Category.choices)
    description = models.CharField(max_length=160, blank=True, default="")
    amount = models.DecimalField(max_digits=14, decimal_places=2)
    payee = models.CharField(max_length=120, blank=True, default="")
    payment_method = models.CharField(
        max_length=24,
        choices=PaymentMethod.choices,
        default=PaymentMethod.CASH,
    )
    reference = models.CharField(max_length=120, blank=True, default="")
    notes = models.CharField(max_length=300, blank=True, default="")
    incurred_at = models.DateTimeField()
    recorded_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name="recorded_expenses",
    )

    class Meta:
        db_table = "commerce_expenses"
        ordering = ["-incurred_at", "-created_at"]


class Budget(BaseModel):
    business = models.ForeignKey(
        "workspaces.Business", on_delete=models.CASCADE, related_name="budgets"
    )
    category = models.CharField(max_length=48, choices=Expense.Category.choices)
    month = models.DateField()
    planned_amount = models.DecimalField(max_digits=14, decimal_places=2)
    notes = models.CharField(max_length=300, blank=True, default="")

    class Meta:
        db_table = "commerce_budgets"
        ordering = ["-month", "category"]
        constraints = [
            models.UniqueConstraint(
                fields=["business", "category", "month"],
                name="commerce_budget_period_unique",
            )
        ]
