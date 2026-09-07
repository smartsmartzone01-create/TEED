from common.database.base_model import BaseModel
from common.database.uuid import generate_uuid
from django.core.exceptions import ValidationError
from django.db import models


def default_supported_locales():
    return ["en", "sw"]


class WebsiteSite(BaseModel):
    class Locale(models.TextChoices):
        ENGLISH = "en", "English"
        SWAHILI = "sw", "Swahili"

    business = models.ForeignKey(
        "workspaces.Business",
        on_delete=models.CASCADE,
        related_name="website_sites",
    )
    public_key = models.UUIDField(default=generate_uuid, unique=True, editable=False)
    slug = models.SlugField(max_length=80)
    display_name = models.CharField(max_length=120)
    default_locale = models.CharField(
        max_length=2,
        choices=Locale.choices,
        default=Locale.ENGLISH,
    )
    supported_locales = models.JSONField(default=default_supported_locales)

    primary_color = models.CharField(max_length=7, default="#0B1F3A")
    surface_color = models.CharField(max_length=7, default="#FFFFFF")
    text_color = models.CharField(max_length=7, default="#111827")

    contact_phone = models.CharField(max_length=32, blank=True, default="")
    contact_email = models.EmailField(blank=True, default="")
    contact_whatsapp = models.CharField(max_length=32, blank=True, default="")
    contact_instagram = models.CharField(max_length=120, blank=True, default="")

    navigation = models.JSONField(default=list, blank=True)
    hero = models.JSONField(default=dict, blank=True)
    services = models.JSONField(default=list, blank=True)
    newsletter = models.JSONField(default=dict, blank=True)

    is_published = models.BooleanField(default=False, db_index=True)

    class Meta:
        db_table = "website_sites"
        ordering = ["display_name", "id"]
        constraints = [
            models.UniqueConstraint(
                fields=["business", "slug"],
                name="website_business_site_slug_unique",
            )
        ]

    def clean(self):
        super().clean()
        if not isinstance(self.supported_locales, list):
            raise ValidationError(
                {"supported_locales": "Supported locales must be a list."}
            )
        supported = {str(locale) for locale in self.supported_locales}
        if self.default_locale not in supported:
            raise ValidationError(
                {
                    "supported_locales": (
                        "Supported locales must include the default locale."
                    )
                }
            )

    def __str__(self):
        return self.display_name


class WebsiteListing(BaseModel):
    site = models.ForeignKey(
        WebsiteSite,
        on_delete=models.CASCADE,
        related_name="listings",
    )
    slug = models.SlugField(max_length=120)
    title = models.JSONField(default=dict)
    short_description = models.JSONField(default=dict, blank=True)
    description = models.JSONField(default=dict, blank=True)
    brand = models.CharField(max_length=80, blank=True, default="")
    badge = models.JSONField(default=dict, blank=True)
    primary_image_url = models.URLField(max_length=500, blank=True, default="")
    options = models.JSONField(default=list, blank=True)
    is_published = models.BooleanField(default=False, db_index=True)
    sort_order = models.PositiveIntegerField(default=0, db_index=True)

    class Meta:
        db_table = "website_listings"
        ordering = ["sort_order", "created_at", "id"]
        constraints = [
            models.UniqueConstraint(
                fields=["site", "slug"],
                name="website_site_listing_slug_unique",
            )
        ]

    def __str__(self):
        title = self.title if isinstance(self.title, dict) else {}
        return title.get("en") or title.get("sw") or self.slug


class WebsiteVariant(BaseModel):
    class Availability(models.TextChoices):
        IN_STOCK = "in_stock", "In stock"
        LOW_STOCK = "low_stock", "Low stock"
        OUT_OF_STOCK = "out_of_stock", "Out of stock"

    class Source(models.TextChoices):
        WEBSITE = "website", "Website"
        COMMERCE = "commerce", "Commerce"

    listing = models.ForeignKey(
        WebsiteListing,
        on_delete=models.CASCADE,
        related_name="variants",
    )
    sku = models.CharField(max_length=64, blank=True, default="")
    options = models.JSONField(default=dict, blank=True)
    website_price = models.DecimalField(
        max_digits=14,
        decimal_places=2,
        null=True,
        blank=True,
    )
    currency = models.CharField(max_length=3, default="TZS")
    website_availability = models.CharField(
        max_length=16,
        choices=Availability.choices,
        default=Availability.IN_STOCK,
    )
    image_url = models.URLField(max_length=500, blank=True, default="")

    commerce_product = models.ForeignKey(
        "commerce.Product",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="website_variants",
    )
    price_source = models.CharField(
        max_length=16,
        choices=Source.choices,
        default=Source.WEBSITE,
    )
    availability_source = models.CharField(
        max_length=16,
        choices=Source.choices,
        default=Source.WEBSITE,
    )

    is_published = models.BooleanField(default=True, db_index=True)
    sort_order = models.PositiveIntegerField(default=0, db_index=True)

    class Meta:
        db_table = "website_variants"
        ordering = ["sort_order", "created_at", "id"]
        constraints = [
            models.UniqueConstraint(
                fields=["listing", "sku"],
                condition=~models.Q(sku=""),
                name="website_listing_sku_unique",
            ),
            models.CheckConstraint(
                condition=models.Q(website_price__isnull=True)
                | models.Q(website_price__gte=0),
                name="website_variant_price_nonnegative",
            ),
        ]

    def clean(self):
        super().clean()
        product = self.commerce_product
        if product is not None and product.business_id != self.listing.site.business_id:
            raise ValidationError(
                {
                    "commerce_product": (
                        "The linked Commerce product must belong to the same workspace."
                    )
                }
            )
        if self.price_source == self.Source.COMMERCE and product is None:
            raise ValidationError(
                {"price_source": "Commerce price requires a linked Commerce product."}
            )
        if self.availability_source == self.Source.COMMERCE and product is None:
            raise ValidationError(
                {
                    "availability_source": (
                        "Commerce availability requires a linked Commerce product."
                    )
                }
            )
        if self.price_source == self.Source.WEBSITE and self.website_price is None:
            raise ValidationError(
                {"website_price": "Website-priced variants require a website price."}
            )

    def valid_commerce_product(self):
        product = self.commerce_product
        if product is None:
            return None
        if product.business_id != self.listing.site.business_id:
            return None
        return product

    def resolved_price(self):
        product = self.valid_commerce_product()
        if (
            self.price_source == self.Source.COMMERCE
            and product is not None
            and product.selling_price is not None
        ):
            return product.selling_price
        return self.website_price

    def resolved_availability(self):
        product = self.valid_commerce_product()
        if self.availability_source != self.Source.COMMERCE or product is None:
            return self.website_availability
        if not product.is_active or product.current_quantity <= 0:
            return self.Availability.OUT_OF_STOCK
        if (
            product.low_stock_threshold > 0
            and product.current_quantity <= product.low_stock_threshold
        ):
            return self.Availability.LOW_STOCK
        return self.Availability.IN_STOCK

    def resolved_sku(self):
        product = self.valid_commerce_product()
        return self.sku or (product.sku if product is not None else "") or str(self.id)

    def __str__(self):
        return self.resolved_sku()
