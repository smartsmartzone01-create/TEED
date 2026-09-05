from django.contrib import admin
from .models import Product, ProductVariant, Category, SubCategory  # ✅ include these
from .models import OfferBanner
from .models import Product, StorageOption
from .models import Product, StorageOption, ProductFAQ  


class ProductVariantInline(admin.TabularInline):
    model = ProductVariant
    extra = 1

from django.contrib import admin
from .models import Product, ProductVariant, SubCategory

# ✅ 1. Brand Filter — custom filter for CharField
class BrandFilter(admin.SimpleListFilter):
    title = 'Brand'
    parameter_name = 'brand'

    def lookups(self, request, model_admin):
        brands = Product.objects.values_list('brand', flat=True).distinct()
        return [(b, b) for b in brands if b]

    def queryset(self, request, queryset):
        if self.value():
            return queryset.filter(brand=self.value())
        return queryset

# ✅ 2. Category Filter — for CharField 'category'
class CategoryFilter(admin.SimpleListFilter):
    title = 'Category'
    parameter_name = 'category'

    def lookups(self, request, model_admin):
        categories = Product.objects.values_list('category', flat=True).distinct()
        return [(cat, cat) for cat in categories if cat]

    def queryset(self, request, queryset):
        if self.value():
            return queryset.filter(category=self.value())
        return queryset


class ProductFAQInline(admin.TabularInline):
    model = ProductFAQ
    extra = 1

# ✅ 3. Price Filter
class PriceFilter(admin.SimpleListFilter):
    title = 'Price Range'
    parameter_name = 'price_range'

    def lookups(self, request, model_admin):
        return [
            ('low', 'Below 1M'),
            ('mid', '1M – 2M'),
            ('high', 'Above 2M'),
        ]

    def queryset(self, request, queryset):
        if self.value() == 'low':
            return queryset.filter(price__lt=1000000)
        elif self.value() == 'mid':
            return queryset.filter(price__gte=1000000, price__lte=2000000)
        elif self.value() == 'high':
            return queryset.filter(price__gt=2000000)
        return queryset

# ✅ 4. Product Admin (place after all filter classes)
@admin.register(Product)
class ProductAdmin(admin.ModelAdmin):
    list_display = (
        'name', 'brand', 'get_storage_display', 'price',
        'in_stock', 'is_hot', 'is_new', 'category', 'subcategory'
    )
    list_filter = (
        'in_stock',
        'is_hot',
        'is_new',
        BrandFilter,
        CategoryFilter,
        'subcategory',
        PriceFilter,
    )
    search_fields = ('name',)
    prepopulated_fields = {'slug': ('name',)}
    filter_horizontal = ('storage_options','comparison_products')

    inlines = [ProductFAQInline]  # << Add this here!

    def get_storage_display(self, obj):
        formatted = []
        for s in obj.storage_options.all():
            if s.size >= 1024:
                tb_value = s.size / 1024
                formatted.append(f"{tb_value:.1f}TB" if tb_value % 1 else f"{int(tb_value)}TB")
            else:
                formatted.append(f"{s.size}GB")
        return ", ".join(formatted)

    get_storage_display.short_description = "Storage"


# You can leave your ProductVariant and SubCategory admin classes below this


@admin.register(ProductVariant)
class ProductVariantAdmin(admin.ModelAdmin):
    list_display = ('product', 'color_name', 'color_code', 'is_default')

# ✅ Add these two below to make them appear in admin:
@admin.register(Category)
class CategoryAdmin(admin.ModelAdmin):
    list_display = ('name', 'slug')
    prepopulated_fields = {'slug': ('name',)}

@admin.register(SubCategory)
class SubCategoryAdmin(admin.ModelAdmin):
    list_display = ('name', 'slug', 'category')
    prepopulated_fields = {'slug': ('name',)}

# Register the OfferBanner model
@admin.register(OfferBanner)
class OfferBannerAdmin(admin.ModelAdmin):
    list_display = ('title', 'product', 'is_active', 'created_at')
    list_filter = ('is_active', 'created_at')
    search_fields = ('title', 'subtitle')

from django.contrib import admin
from .models import Order, OrderItem

class OrderItemInline(admin.TabularInline):
    model = OrderItem
    readonly_fields = ('product', 'quantity', 'price')
    extra = 0

@admin.register(Order)
class OrderAdmin(admin.ModelAdmin):
    list_display = ('id', 'user', 'status', 'total_price', 'created_at')
    list_filter = ('status', 'created_at')
    search_fields = ('user__username', 'full_name', 'email', 'phone')
    readonly_fields = ('user', 'total_price', 'created_at')
    inlines = [OrderItemInline]


     