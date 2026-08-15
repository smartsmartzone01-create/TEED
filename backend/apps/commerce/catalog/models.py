from common.database.base_model import BaseModel
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


class UnitDefinition(BaseModel):
    business = models.ForeignKey(
        "workspaces.Business", on_delete=models.CASCADE, related_name="commerce_units"
    )
    code = models.CharField(max_length=40)
    name = models.CharField(max_length=32)
    base_unit = models.CharField(max_length=32, blank=True, default="")
    conversion_to_base = models.DecimalField(max_digits=14, decimal_places=6, default=1)

    class Meta:
        db_table = "commerce_unit_definitions"
        ordering = ["name"]
        constraints = [
            models.UniqueConstraint(
                fields=["business", "code"], name="commerce_business_unit_code_unique"
            ),
            models.UniqueConstraint(
                fields=["business", "name"], name="commerce_business_unit_name_unique"
            ),
            models.CheckConstraint(
                condition=models.Q(conversion_to_base__gt=0),
                name="commerce_unit_conversion_positive",
            ),
        ]
