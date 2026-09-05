from django.shortcuts import render, get_object_or_404
from django.db.models import Q
from .models import Product, SubCategory, Category
from django.contrib.auth.forms import UserCreationForm
from django.shortcuts import render, redirect
from django.contrib.auth.decorators import login_required
from django.shortcuts import redirect, get_object_or_404
from store.models import CartItem  # ✅ CORRECT
from django.views.decorators.http import require_POST
from django.shortcuts import redirect
from django.http import JsonResponse
from django.shortcuts import render, redirect
from django.contrib.auth import authenticate, login
from django.views.decorators.csrf import csrf_protect
from django.contrib.auth import logout
from django.contrib.auth.models import User
from django.contrib.auth.forms import UserChangeForm
from django.contrib import messages
from .models import SavedItem
from django.http import JsonResponse
from django.utils import timezone
from django.shortcuts import render, redirect
from django.contrib.auth.decorators import login_required
from .models import Order, OrderItem, CartItem
from django.shortcuts import redirect
from django.contrib import messages
from .forms import NewsletterForm
from store.models import Category
# ✅ 1. Homepage view
def home(request):
    return render(request, 'store/home.html')  # Simple homepage for now


# ✅ 2. Product detail view
def product_detail(request, slug):
    product = Product.objects.prefetch_related('variants').get(slug=slug)
    similar_products = Product.objects.exclude(id=product.id)[:5]
    comparison_product = similar_products[0] if similar_products else None

    return render(request, 'store/product_detail.html', {
        'product': product,
        'similar_products': similar_products,
        
    })



# ✅ 3. Product list by subcategory (only needed if you ever need subcategory listings directly)
def products_by_subcategory(request, subcategory_slug):
    subcategory = get_object_or_404(SubCategory, slug=subcategory_slug)
    products = Product.objects.filter(subcategory=subcategory)
    recommended_products = Product.objects.filter(is_new=True)[:4]

    # Add this:
    saved_products = []
    if request.user.is_authenticated:
        saved_products = SavedItem.objects.filter(user=request.user).values_list('product_id', flat=True)

    return render(request, 'store/products.html', {
        'products': products,
        'subcategory': subcategory,
        'recommended_products': recommended_products,
        'saved_products': saved_products,  # 👈 pass this to the template
    })


# ✅ 4. Product list by category (main logic for nav dropdowns)
def products_by_category(request, category_slug):
    category = get_object_or_404(Category, slug=category_slug)
    products = Product.objects.filter(category__iexact=category_slug)
    recommended_products = Product.objects.filter(is_new=True)[:2]

    # Add this:
    saved_products = []
    if request.user.is_authenticated:
        saved_products = SavedItem.objects.filter(user=request.user).values_list('product_id', flat=True)

    return render(request, 'store/products.html', {
        'products': products,
        'category': category,
        'recommended_products': recommended_products,
        'saved_products': saved_products,
        
    })


# ✅ 5. Search logic
def search(request):
    query = request.GET.get('q', '')
    results = []

    if query:
        results = Product.objects.filter(
            Q(name__icontains=query) | Q(description__icontains=query)
        )
 # Reuse same logic as products_by_category
    recommended_products = Product.objects.filter(is_new=True)[:4]

    return render(request, 'store/search_results.html', {
        'query': query,
        'results': results,
        'recommended_products': recommended_products
    })

# ✅ 6. User registration view
def register(request):
    if request.method == 'POST':
        form = UserCreationForm(request.POST)
        if form.is_valid():
            user = form.save()
            return redirect('login')
    else:
        form = UserCreationForm()
    return render(request, 'registration/register.html', {'form': form})

# ✅ 7. Add to cart 

login_required
def add_to_cart(request, slug):
    product = get_object_or_404(Product, slug=slug)
    cart = request.user.cart

    cart_item, created = CartItem.objects.get_or_create(cart=cart, product=product)
    if not created:
        cart_item.quantity += 1
        cart_item.save()

    return redirect('store:cart')

@login_required
def view_cart(request):
    cart = request.user.cart
    cart_items = cart.items.select_related('product')

    total = 0
    for item in cart_items:
        price = item.product.discount_price or item.product.price
        item.subtotal = price * item.quantity  # 👈 attach subtotal to each item
        total += item.subtotal

    return render(request, 'store/cart.html', {
        'cart_items': cart_items,
        'total': total,
    })
# ✅ 8. remove to cart view
@require_POST
@login_required
def remove_from_cart(request, item_id):
    item = get_object_or_404(CartItem, id=item_id, cart=request.user.cart)
    item.delete()
    return redirect('store:cart')

# ✅ 9.  cart quantinty
@require_POST
@login_required
def update_cart_quantity(request, item_id):
    cart = request.user.cart
    item = get_object_or_404(CartItem, id=item_id, cart=cart)

    try:
        quantity = int(request.POST.get('quantity', 1))
        if quantity > 0:
            item.quantity = quantity
            item.save()
    except ValueError:
        pass  # Optionally handle bad input

    return redirect('store:cart')

# ✅ 10. remove form cart logic
@login_required
def remove_from_cart(request, item_id):
    try:
        item = CartItem.objects.get(id=item_id, cart=request.user.cart)
        item.delete()
    except CartItem.DoesNotExist:
        pass
    return redirect('store:cart')

# ✅ 11. update quantity cart logic
@login_required
@require_POST
def update_cart_quantity(request):
    item_id = request.POST.get('item_id')
    quantity = request.POST.get('quantity')

    try:
        item = CartItem.objects.get(id=item_id, cart=request.user.cart)
        item.quantity = max(1, int(quantity))  # prevent zero or negative quantities
        item.save()
    except (CartItem.DoesNotExist, ValueError):
        pass

    return redirect('store:cart')

# ✅ 12. check out cart logic
@login_required
@require_POST
def clear_cart(request):
    cart = request.user.cart
    cart.items.all().delete()
    return redirect('store:cart')

    # # ✅ 13. Checkout Page (Placeholder) cart logic
@login_required
def checkout(request):
    cart = request.user.cart
    cart_items = cart.items.select_related('product')
    
    total = sum(
        (item.product.discount_price or item.product.price) * item.quantity
        for item in cart_items
    )

    return render(request, 'store/checkout.html', {
        'cart_items': cart_items,
        'total': total,
    })

    # # ✅ 14. optional checkout logic
@require_POST
@login_required
def update_cart_quantity(request):
    product_id = request.POST.get('product_id')
    quantity = request.POST.get('quantity')

    try:
        quantity = int(quantity)
        product = get_object_or_404(Product, id=product_id)
        cart_item = CartItem.objects.get(cart=request.user.cart, product=product)

        if quantity > 0:
            cart_item.quantity = quantity
            cart_item.save()
        else:
            cart_item.delete()

        return JsonResponse({'success': True})

    except Exception as e:
        return JsonResponse({'success': False, 'error': str(e)})
# ✅ 15. Login view
@csrf_protect  # Ensures POST requests are CSRF protected
def login_view(request):
    if request.method == 'POST':
        username = request.POST.get('username')
        password = request.POST.get('password')

        user = authenticate(request, username=username, password=password)
        if user is not None:
            login(request, user)
            return redirect('store:home')  # Redirect after successful login
        else:
            # Invalid credentials
            return render(request, 'store/login.html', {
                'error': 'Invalid username or password',
                'username': username,  # Repopulate username field
            })

    return render(request, 'store/login.html')

def logout_view(request):
    logout(request)
    return redirect('store:home') 

    # ✅ 16. Register view 
def register_view(request):
    if request.method == 'POST':
        username = request.POST.get('username')
        email    = request.POST.get('email')
        password = request.POST.get('password')
        confirm  = request.POST.get('confirm')

        if password != confirm:
            return render(request, 'store/register.html', {
                'error': 'Passwords do not match',
                'username': username,
                'email': email
            })

        if User.objects.filter(username=username).exists():
            return render(request, 'store/register.html', {
                'error': 'Username already exists',
                'email': email
            })

        user = User.objects.create_user(username=username, email=email, password=password)
        login(request, user)
        return redirect('store:home')  # redirect to homepage or profile

    return render(request, 'store/register.html')

# ✅ 17. Profile view
@login_required
def profile_view(request):
    return render(request, 'store/profile.html', {
        'user': request.user
    })

# ✅ 18. Edit profile view
@login_required
def profile(request):
    return render(request, 'store/profile.html')

@login_required
def edit_profile(request):
    if request.method == 'POST':
        form = UserChangeForm(request.POST, instance=request.user)
        if form.is_valid():
            form.save()
            messages.success(request, 'Profile updated successfully.')
            return redirect('store:profile')
    else:
        form = UserChangeForm(instance=request.user)
    return render(request, 'store/edit_profile.html', {'form': form})

 # ✅ 19. Order history view   
@login_required
def orders_view(request):
    orders = request.user.orders.all().order_by('-created_at')  # get all orders of current user
    return render(request, 'store/orders.html', {'orders': orders})

@require_POST
@login_required
def toggle_saved_item(request, product_id):
    product = get_object_or_404(Product, id=product_id)
    saved, created = SavedItem.objects.get_or_create(user=request.user, product=product)

    if not created:
        saved.delete()
        if request.headers.get('x-requested-with') == 'XMLHttpRequest':
            return JsonResponse({'status': 'unsaved', 'product': product.name})
        messages.info(request, f"Removed '{product.name}' from saved items.")
    else:
        if request.headers.get('x-requested-with') == 'XMLHttpRequest':
            return JsonResponse({'status': 'saved', 'product': product.name})
        messages.success(request, f"Saved '{product.name}' for later.")

    # fallback for regular POST (non-AJAX)
    return redirect(request.META.get('HTTP_REFERER', 'store:products'))
    
@login_required
def saved_items_view(request):
    items = SavedItem.objects.filter(user=request.user).select_related('product')
    return render(request, 'store/saved_items.html', {'items': items})
# ✅ 20. Saved items view

#checkout view
from django.shortcuts import render, redirect
from django.contrib.auth.decorators import login_required
from .models import CartItem, Order, OrderItem

@login_required
def checkout_view(request):
    cart_items = CartItem.objects.filter(cart=request.user.cart)

    total = sum(
        (item.product.discount_price or item.product.price) * item.quantity
        for item in cart_items
    )

    if request.method == 'POST':
        full_name = request.POST.get('full_name')
        email = request.POST.get('email')
        phone = request.POST.get('phone')
        address = request.POST.get('address')
        notes = request.POST.get('notes')

        # Validate required fields
        if not all([full_name, email, phone, address]):
            return render(request, 'store/checkout.html', {
                'cart_items': cart_items,
                'total': total,
                'error': 'Please fill in all required fields.'
            })

        # Create order
        order = Order.objects.create(
            user=request.user,
            full_name=full_name,
            email=email,
            phone=phone,
            address=address,
            notes=notes,
            total_price=total
        )

        # Create order items
        for item in cart_items:
            price = item.product.discount_price or item.product.price
            OrderItem.objects.create(
                order=order,
                product=item.product,
                quantity=item.quantity,
                price=price
            )

        # Clear cart
        cart_items.delete()

        return redirect('store:order_success')

    return render(request, 'store/checkout.html', {
        'cart_items': cart_items,
        'total': total
    })

@login_required
def order_success_view(request):
    return render(request, 'store/order_success.html')

def get_session_key(request):
    return JsonResponse({"message": "Session key logic goes here"})

def all_products(request):
    products = Product.objects.filter(in_stock=True)
    return render(request, 'products.html', {'products': products})

def subscribe_newsletter(request):
    if request.method == 'POST':
        form = NewsletterForm(request.POST)
        if form.is_valid():
            form.save()
            messages.success(request, "Thank you for subscribing!")
        else:
            messages.error(request, "You have already subscribed or provided an invalid email.")
    return redirect(request.META.get('HTTP_REFERER', '/'))

def about_us(request):
    return render(request, 'store/about_us.html')

def your_view(request):
    categories = Category.objects.prefetch_related('subcategories').all()
    return render(request, 'store/base.html', {
        'categories': categories,
    })

def terms_of_service(request):
    return render(request, 'store/terms_of_service.html')

def privacy_policy(request):
    return render(request, 'store/privacy_policy.html')

def cookie_policy(request):
    return render(request, 'store/cookie_policy.html')

def disclaimer(request):
    return render(request, 'store/disclaimer.html')

def learn_more(request):
    return render(request, 'store/learn_more.html')

def product_list(request):
    products = Product.objects.filter(in_stock=True)

    # Filters
    in_stock = request.GET.get('in_stock')
    is_hot = request.GET.get('is_hot')
    is_new = request.GET.get('is_new')
    brand = request.GET.get('brand')
    storage = request.GET.get('storage')
    category = request.GET.get('category')
    subcategory = request.GET.get('subcategory')
    price_range = request.GET.get('price_range')

    if in_stock in ['true', 'false']:
        products = products.filter(in_stock=(in_stock == 'true'))

    if is_hot in ['true', 'false']:
        products = products.filter(is_hot=(is_hot == 'true'))

    if is_new in ['true', 'false']:
        products = products.filter(is_new=(is_new == 'true'))

    if brand:
        products = products.filter(brand=brand)

    if storage:
        try:
            storage_val = int(storage)
            products = products.filter(storage=storage_val)
        except ValueError:
            pass

    if category:
        products = products.filter(category=category)

    if subcategory:
        products = products.filter(subcategory__slug=subcategory)

    if price_range == 'below-1000000':
        products = products.filter(price__lt=1000000)
    elif price_range == '1000000-2000000':
        products = products.filter(price__gte=1000000, price__lte=2000000)
    elif price_range == 'above-2000000':
        products = products.filter(price__gt=2000000)

    # Get distinct values for filter dropdowns
    brands = Product.objects.values_list('brand', flat=True).distinct()
    storages = Product.objects.values_list('storage', flat=True).distinct()
    categories = Product.objects.values_list('category', flat=True).distinct()
    subcategories = SubCategory.objects.all()

    context = {
        'products': products,
        'brands': brands,
        'storages': storages,
        'categories': categories,
        'subcategories': subcategories,
        'selected_brand': brand,
        'selected_storage': storage,
        'selected_category': category,
        'selected_subcategory': subcategory,
        'selected_price_range': price_range,
        'selected_in_stock': in_stock,
        'selected_is_hot': is_hot,
        'selected_is_new': is_new,
    }
    return render(request, 'store/products.html', context)




