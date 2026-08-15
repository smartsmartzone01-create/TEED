from django.db import transaction
from rest_framework.exceptions import ValidationError

from apps.workspaces.policy import WorkspacePermission

from ..services import commerce_membership
from .models import Product


def active_catalog_products(*, business):
    return Product.objects.filter(business=business, is_active=True)


@transaction.atomic
def set_catalog_product_active(*, actor, business_id, product_id, is_active):
    membership = commerce_membership(
        user=actor,
        business_id=business_id,
        permission=WorkspacePermission.MANAGE_CATALOG,
    )
    product = (
        Product.objects.select_for_update()
        .filter(id=product_id, business=membership.business)
        .first()
    )
    if product is None:
        raise ValidationError({"product": ["Item not found."]})
    if not is_active and product.current_quantity > 0:
        raise ValidationError(
            {"is_active": ["An item with available stock cannot be archived."]}
        )
    product.is_active = is_active
    product.save(update_fields=["is_active", "updated_at"])
    return product
