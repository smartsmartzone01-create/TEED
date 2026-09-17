from common.database.base_model import BaseModel
from common.database.uuid import generate_uuid
from django.core.exceptions import ValidationError
from django.db import models
from django.utils import timezone

from . import order_models as _order_models


def default_supported_locales():
    return ["en", "sw"]


def generate_website_variant_sku():
    return f"WEB-{generate_uuid().hex[:10].upper()}"


class WebsiteSite(BaseModel):
    class Locale(models.TextChoices):
        ENGLISH = "en", "English"
        SWAHILI = "sw", "Swahili"

    business = models.ForeignKey("workspaces.Business", on_delete=models.CASCADE, related_name="website_sites")
    public_key = models.UUIDField(default=generate_uuid, unique=True, editable=False)
    slug = models.SlugField(max_length=80)
    display_name = models.CharField(max_length=120)
    default_locale = models.CharField(max_length=2, choices=Locale.choices, default=Locale.ENGLISH)
    supported_locales = models.JSONField(default=default_supported_locales)
    primary_color = models.CharField(max_length=7, default="#0B1F3A")
    surface_color = models.CharField(max_length=7, default="#FFFFFF")
    text_color = models.CharField(max_length=7, default="#111827")
    contact_phone = models.CharField(max_length=32, blank=True, default="")
    contact_email = models.EmailField(blank=True, default="")
    contact_whatsapp = models.CharField(max_length=32, blank=True, default="")
    contact_instagram = models.CharField(max_length=120, blank=True, default="")
    header = models.JSONField(default=dict, blank=True)
    navigation = models.JSONField(default=list, blank=True)
    hero = models.JSONField(default=dict, blank=True)
    featured_products = models.JSONField(default=dict, blank=True)
    categories = models.JSONField(default=dict, blank=True)
    services = models.JSONField(default=list, blank=True)
    newsletter = models.JSONField(default=dict, blank=True)
    is_published = models.BooleanField(default=False, db_index=True)

    class Meta:
        db_table = "website_sites"
        ordering = ["display_name", "id"]
        constraints = [models.UniqueConstraint(fields=["business", "slug"], name="website_business_site_slug_unique")]

    def clean(self):
        super().clean()
        if not isinstance(self.supported_locales, list):
            raise ValidationError({"supported_locales": "Supported locales must be a list."})
        if self.default_locale not in {str(locale) for locale in self.supported_locales}:
            raise ValidationError({"supported_locales": "Supported locales must include the default locale."})
        if not isinstance(self.header, dict):
            raise ValidationError({"header": "Header settings must be an object."})
        if not isinstance(self.featured_products, dict):
            raise ValidationError({"featured_products": "Featured products settings must be an object."})
        if not isinstance(self.categories, dict):
            raise ValidationError({"categories": "Category settings must be an object."})

    def __str__(self):
        return self.display_name


class WebsiteMedia(BaseModel):
    class Kind(models.TextChoices):
        IMAGE = "image", "Image"

    site = models.ForeignKey(WebsiteSite, on_delete=models.CASCADE, related_name="media")
    kind = models.CharField(max_length=16, choices=Kind.choices, default=Kind.IMAGE)
    public_url = models.URLField(max_length=500)
    storage_key = models.CharField(max_length=500, blank=True, default="")
    original_name = models.CharField(max_length=255, blank=True, default="")
    mime_type = models.CharField(max_length=100, blank=True, default="")
    alt_text = models.JSONField(default=dict, blank=True)
    width = models.PositiveIntegerField(null=True, blank=True)
    height = models.PositiveIntegerField(null=True, blank=True)
    size_bytes = models.PositiveBigIntegerField(null=True, blank=True)
    sort_order = models.PositiveIntegerField(default=0, db_index=True)

    class Meta:
        db_table = "website_media"
        ordering = ["sort_order", "created_at", "id"]

    def clean(self):
        super().clean()
        if not isinstance(self.alt_text, dict):
            raise ValidationError({"alt_text": "Media alt text must be a locale map."})

    def __str__(self):
        return self.original_name or self.public_url


class WebsiteListing(BaseModel):
    site = models.ForeignKey(WebsiteSite, on_delete=models.CASCADE, related_name="listings")
    slug = models.SlugField(max_length=120)
    title = models.JSONField(default=dict)
    short_description = models.JSONField(default=dict, blank=True)
    description = models.JSONField(default=dict, blank=True)
    brand = models.CharField(max_length=80, blank=True, default="")
    badge = models.JSONField(default=dict, blank=True)
    primary_image_url = models.URLField(max_length=500, blank=True, default="")
    primary_media = models.ForeignKey(WebsiteMedia, on_delete=models.SET_NULL, null=True, blank=True, related_name="primary_for_listings")
    discover_media = models.ForeignKey(WebsiteMedia, on_delete=models.SET_NULL, null=True, blank=True, related_name="discover_for_listings")
    options = models.JSONField(default=list, blank=True)
    is_published = models.BooleanField(default=False, db_index=True)
    published_at = models.DateTimeField(null=True, blank=True, db_index=True)
    detail_view_count = models.PositiveBigIntegerField(default=0, db_index=True)
    sort_order = models.PositiveIntegerField(default=0, db_index=True)

    class Meta:
        db_table = "website_listings"
        ordering = ["sort_order", "created_at", "id"]
        constraints = [models.UniqueConstraint(fields=["site", "slug"], name="website_site_listing_slug_unique")]

    def clean(self):
        super().clean()
        if self.primary_media is not None and self.primary_media.site_id != self.site_id:
            raise ValidationError({"primary_media": "Primary media must belong to the same website site."})
        if self.discover_media is not None and self.discover_media.site_id != self.site_id:
            raise ValidationError({"discover_media": "Discover media must belong to the same website site."})

    def save(self, *args, **kwargs):
        if self.is_published and self.published_at is None:
            self.published_at = timezone.now()
            update_fields = kwargs.get("update_fields")
            if update_fields is not None:
                kwargs["update_fields"] = list(set(update_fields) | {"published_at"})
        super().save(*args, **kwargs)

    def resolved_primary_image_url(self):
        return (self.primary_media.public_url if self.primary_media is not None else "") or self.primary_image_url

    def resolved_discover_image_url(self):
        return (self.discover_media.public_url if self.discover_media is not None else "") or self.resolved_primary_image_url()

    def __str__(self):
        title = self.title if isinstance(self.title, dict) else {}
        return title.get("en") or title.get("sw") or self.slug


class WebsiteListingStoryBlock(BaseModel):
    listing = models.ForeignKey(WebsiteListing, on_delete=models.CASCADE, related_name="story_blocks")
    heading = models.JSONField(default=dict, blank=True)
    body = models.JSONField(default=dict, blank=True)
    media = models.ForeignKey(WebsiteMedia, on_delete=models.SET_NULL, null=True, blank=True, related_name="listing_story_blocks")
    sort_order = models.PositiveIntegerField(default=0, db_index=True)

    class Meta:
        db_table = "website_listing_story_blocks"
        ordering = ["sort_order", "created_at", "id"]

    def clean(self):
        super().clean()
        if not isinstance(self.heading, dict):
            raise ValidationError({"heading": "Story heading must be a locale map."})
        if not isinstance(self.body, dict):
            raise ValidationError({"body": "Story body must be a locale map."})
        if self.media is not None and self.media.site_id != self.listing.site_id:
            raise ValidationError({"media": "Story media must belong to the same website site."})

    def __str__(self):
        heading = self.heading if isinstance(self.heading, dict) else {}
        return heading.get("en") or heading.get("sw") or f"Story block {self.id}"


class WebsiteVariant(BaseModel):
    class Availability(models.TextChoices):
        IN_STOCK = "in_stock", "In stock"
        LOW_STOCK = "low_stock", "Low stock"
        OUT_OF_STOCK = "out_of_stock", "Out of stock"

    class Source(models.TextChoices):
        WEBSITE = "website", "Website"
        COMMERCE = "commerce", "Commerce"

    listing = models.ForeignKey(WebsiteListing, on_delete=models.CASCADE, related_name="variants")
    sku = models.CharField(max_length=64, blank=True, default=generate_website_variant_sku)
    options = models.JSONField(default=dict, blank=True)
    website_price = models.DecimalField(max_digits=14, decimal_places=2, null=True, blank=True)
    currency = models.CharField(max_length=3, default="TZS")
    website_availability = models.CharField(max_length=16, choices=Availability.choices, default=Availability.IN_STOCK)
    image_url = models.URLField(max_length=500, blank=True, default="")
    media = models.ForeignKey(WebsiteMedia, on_delete=models.SET_NULL, null=True, blank=True, related_name="variant_usages")
    commerce_product = models.ForeignKey("commerce.Product", on_delete=models.SET_NULL, null=True, blank=True, related_name="website_variants")
    commerce_connected = models.BooleanField(default=True, db_index=True)
    price_source = models.CharField(max_length=16, choices=Source.choices, default=Source.WEBSITE)
    availability_source = models.CharField(max_length=16, choices=Source.choices, default=Source.WEBSITE)
    is_published = models.BooleanField(default=True, db_index=True)
    sort_order = models.PositiveIntegerField(default=0, db_index=True)

    class Meta:
        db_table = "website_variants"
        ordering = ["sort_order", "created_at", "id"]
        constraints = [
            models.UniqueConstraint(fields=["listing", "sku"], condition=~models.Q(sku=""), name="website_listing_sku_unique"),
            models.CheckConstraint(condition=models.Q(website_price__isnull=True) | models.Q(website_price__gte=0), name="website_variant_price_nonnegative"),
        ]

    def clean(self):
        super().clean()
        if self.media is not None and self.media.site_id != self.listing.site_id:
            raise ValidationError({"media": "Variant media must belong to the same website site."})
        product = self.commerce_product
        if product is not None and product.business_id != self.listing.site.business_id:
            raise ValidationError({"commerce_product": "The linked Commerce product must belong to the same workspace."})
        if self.availability_source == self.Source.COMMERCE and product is None:
            raise ValidationError({"availability_source": "Commerce availability requires a linked Commerce product."})
        if product is not None and not self.commerce_connected and self.is_published:
            raise ValidationError({"is_published": "A Commerce variant must be reconnected to Website before it can be published."})

    def valid_commerce_product(self):
        product = self.commerce_product
        if product is None or not self.commerce_connected:
            return None
        if product.business_id != self.listing.site.business_id:
            return None
        return product

    def resolved_price(self):
        return self.website_price

    def resolved_availability(self):
        product = self.valid_commerce_product()
        if self.availability_source != self.Source.COMMERCE or product is None:
            return self.website_availability
        from apps.commerce.catalog.exposure import sku_inventory_state
        return sku_inventory_state(product)["availability"]

    def resolved_image_urls(self):
        gallery_urls = [item.media.public_url for item in self.gallery_items.all() if item.media.public_url]
        if gallery_urls:
            return gallery_urls
        fallback = self.resolved_image_url()
        return [fallback] if fallback else []

    def resolved_image_url(self):
        return (self.media.public_url if self.media is not None else "") or self.image_url

    def resolved_sku(self):
        product = self.valid_commerce_product()
        return self.sku or (product.sku if product is not None else "") or str(self.id)

    def __str__(self):
        return self.resolved_sku()


class WebsiteVariantMedia(BaseModel):
    variant = models.ForeignKey(WebsiteVariant, on_delete=models.CASCADE, related_name="gallery_items")
    media = models.ForeignKey(WebsiteMedia, on_delete=models.CASCADE, related_name="variant_gallery_items")
    sort_order = models.PositiveIntegerField(default=0, db_index=True)

    class Meta:
        db_table = "website_variant_media"
        ordering = ["sort_order", "created_at", "id"]
        constraints = [models.UniqueConstraint(fields=["variant", "media"], name="website_variant_media_unique")]

    def clean(self):
        super().clean()
        if self.media_id and self.variant_id and self.media.site_id != self.variant.listing.site_id:
            raise ValidationError({"media": "Variant gallery media must belong to the same website site."})

    def __str__(self):
        return f"{self.variant_id}:{self.media_id}"
