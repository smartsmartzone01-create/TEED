from django.urls import path
from . import views
from django.contrib.auth import views as auth_views

app_name = 'store'

urlpatterns = [
    path('', views.home, name='home'),
    path('product/<slug:slug>/', views.product_detail, name='product_detail'),
    path('products/<slug:subcategory_slug>/', views.products_by_subcategory, name='product_list_by_subcategory'),
    path('category/<slug:category_slug>/', views.products_by_category, name='products_by_category'),
    path('search/', views.search, name='search'),
    
    path('login/', views.login_view, name='login'),
    path('logout/', views.logout_view, name='logout'),
    path('register/', views.register_view, name='register'),
    path('profile/', views.profile_view, name='profile'),

    path('cart/add/<slug:slug>/', views.add_to_cart, name='add_to_cart'),
    path('cart/', views.view_cart, name='cart'),
    path('cart/remove/<int:item_id>/', views.remove_from_cart, name='remove_from_cart'),
    path('cart/update/<int:item_id>/', views.update_cart_quantity, name='update_cart_quantity'),
    path('cart/clear/', views.clear_cart, name='clear_cart'),


    path('edit-profile/', views.edit_profile, name='edit_profile'),
    path('change-password/', auth_views.PasswordChangeView.as_view(
        template_name='store/change_password.html',
        success_url='/store/profile/'
    ), name='change_password'),
    path('logout/', auth_views.LogoutView.as_view(next_page='store:login'), name='logout'),
    path('orders/', views.orders_view, name='orders'),
    path('saved-items/', views.saved_items_view, name='saved_items'),
    path('toggle-save/<int:product_id>/', views.toggle_saved_item, name='toggle_saved_item'),
    path('checkout/', views.checkout_view, name='checkout'),
    path('order-success/', views.order_success_view, name='order_success'),
    path("session-key/", views.get_session_key, name="get_session_key"),
    path('products/', views.all_products, name='all_products'),
    path('subscribe/', views.subscribe_newsletter, name='subscribe_newsletter'),
    path('about/', views.about_us, name='about'),
    path('products/<slug:subcategory_slug>/', views.products_by_subcategory, name='products_by_subcategory'),
    path('terms_of_service/', views.terms_of_service, name='terms'),
    path('privacy_policy/', views.privacy_policy, name='privacy'),
    path('cookie_policy/', views.cookie_policy, name='cookies'),
    path('disclaimer/', views.disclaimer, name='disclaimer'),
    path('learn-more/', views.learn_more, name='learn_more'),
    


]
    
    


