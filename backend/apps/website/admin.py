from django.contrib import admin

from .models import WebsiteListing, WebsiteSite, WebsiteVariant


class WebsiteVariantInline(admin.TabularInline):
    model = WebsiteVariant
    extra = 0


@admin.register(WebsiteSite)
class WebsiteSiteAdmin(admin.ModelAdmin):
    list_display = ("display_name", "business", "slug", "is_published", "public_key")
    list_filter = ("is_published", "default_locale")
    search_fields = ("display_name", "slug", "business__name")
    readonly_fields = ("public_key",)


@admin.register(WebsiteListing)
class WebsiteListingAdmin(admin.ModelAdmin):
    list_display = ("slug", "site", "brand", "is_published", "sort_order")
    list_filter = ("is_published",)
    search_fields = ("slug", "brand", "site__display_name")
    inlines = (WebsiteVariantInline,)


@admin.register(WebsiteVariant)
class WebsiteVariantAdmin(admin.ModelAdmin):
    list_display = (
        "sku",
        "listing",
        "price_source",
        "availability_source",
        "commerce_product",
        "is_published",
    )
    list_filter = ("price_source", "availability_source", "is_published")
    search_fields = ("sku", "listing__slug", "commerce_product__name")
