from .models import Category, Product, CartItem
from .models import Cart
from .models import OfferBanner
from .models import Category

def header_data(request):
    # Get all categories with subcategories
    categories = Category.objects.prefetch_related('subcategories').all()

    # Quick links (select specific top categories by slug)
    quick_links = categories.filter(slug__in=['iphones', 'samsung', 'accessories', 'audio'])

    # Recommended products (recent, in-stock)
    recommended_products = Product.objects.filter(in_stock=True).order_by('-id')[:5]

    # Return one combined dictionary only
    return {
        'nav_categories': categories,
        'quick_links': quick_links,
        'recommended_products': recommended_products,
        'user': request.user,
        'cart_count': 0,  # TODO: Replace with real cart logic later
    }

def header_data(request):
    categories = Category.objects.prefetch_related('subcategories').all()
    quick_links = categories.filter(slug__in=['iphones', 'samsung', 'accessories', 'audio'])
    recommended_products = Product.objects.filter(in_stock=True).order_by('-id')[:5]

    cart_count = 0
    if request.user.is_authenticated and hasattr(request.user, 'cart'):
        cart_count = CartItem.objects.filter(cart=request.user.cart).count()

    return {
        'nav_categories': categories,
        'quick_links': quick_links,
        'recommended_products': recommended_products,
        'user': request.user,
        'cart_count': cart_count,
    }

def global_offer_banner(request):
    offer_banner = OfferBanner.objects.filter(is_active=True).order_by('-created_at').first()
    return {'global_offer_banner': offer_banner}

def saved_items_processor(request):
    saved_products = []
    if request.user.is_authenticated:
        saved_products = request.user.saved_items.values_list('product_id', flat=True)
    return {'saved_product_ids': list(saved_products)}



def footer_shop_data(request):
    return {
        'footer_categories': Category.objects.prefetch_related('subcategories').all()
    }

