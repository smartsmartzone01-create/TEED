from common.database.base_model import BaseModel
from django.db import models


class WebsiteOrder(BaseModel):
    class Status(models.TextChoices):
        NEW = "new", "New"
        CONFIRMED = "confirmed", "Confirmed"
        COMPLETED = "completed", "Completed"
        CANCELLED = "cancelled", "Cancelled"

    site = models.ForeignKey(
        "website.WebsiteSite",
        on_delete=models.CASCADE,
        related_name="orders",
    )
    order_number = models.CharField(max_length=20, unique=True, editable=False, blank=True)
    status = models.CharField(max_length=16, choices=Status.choices, default=Status.NEW, db_index=True)
    customer_full_name = models.CharField(max_length=120)
    customer_phone = models.CharField(max_length=32)
    customer_email = models.EmailField(blank=True, default="")
    delivery_address = models.TextField()
    note = models.TextField(blank=True, default="")
    currency = models.CharField(max_length=3, default="TZS")
    total = models.DecimalField(max_digits=14, decimal_places=2, default=0)

    class Meta:
        db_table = "website_orders"
        ordering = ["-created_at", "-id"]
        constraints = [
            models.CheckConstraint(
                condition=models.Q(total__gte=0),
                name="website_order_total_nonnegative",
            )
        ]

    def save(self, *args, **kwargs):
        if not self.order_number:
            compact_id = str(self.id).replace("-", "").upper()
            self.order_number = f"TKZ-{compact_id[:12]}"
            update_fields = kwargs.get("update_fields")
            if update_fields is not None:
                kwargs["update_fields"] = list(set(update_fields) | {"order_number"})
        super().save(*args, **kwargs)

    def __str__(self):
        return self.order_number or str(self.id)


class WebsiteOrderItem(BaseModel):
    order = models.ForeignKey(
        WebsiteOrder,
        on_delete=models.CASCADE,
        related_name="items",
    )
    listing = models.ForeignKey(
        "website.WebsiteListing",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="order_items",
    )
    variant = models.ForeignKey(
        "website.WebsiteVariant",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="order_items",
    )
    offer_id = models.CharField(max_length=160)
    product_slug = models.SlugField(max_length=120)
    title = models.JSONField(default=dict)
    sku = models.CharField(max_length=64, blank=True, default="")
    options = models.JSONField(default=dict, blank=True)
    image_url = models.URLField(max_length=500, blank=True, default="")
    quantity = models.PositiveIntegerField()
    unit_price = models.DecimalField(max_digits=14, decimal_places=2)
    line_total = models.DecimalField(max_digits=14, decimal_places=2)
    currency = models.CharField(max_length=3, default="TZS")

    class Meta:
        db_table = "website_order_items"
        ordering = ["created_at", "id"]
        constraints = [
            models.CheckConstraint(
                condition=models.Q(quantity__gte=1),
                name="website_order_item_quantity_positive",
            ),
            models.CheckConstraint(
                condition=models.Q(unit_price__gte=0),
                name="website_order_item_unit_price_nonnegative",
            ),
            models.CheckConstraint(
                condition=models.Q(line_total__gte=0),
                name="website_order_item_line_total_nonnegative",
            ),
        ]

    def __str__(self):
        return f"{self.order.order_number}:{self.sku or self.offer_id}"
