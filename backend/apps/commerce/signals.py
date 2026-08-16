from decimal import Decimal

from django.db import transaction
from django.db.models.signals import post_save
from django.dispatch import receiver

from apps.notifications.models import UserNotification
from apps.notifications.services import notify_user
from apps.workspaces.models import BusinessMembership
from apps.workspaces.policy import WorkspacePermission, role_has_permission

from .models import InventoryMovement, Product


def _quantity_text(value):
    if value == value.to_integral_value():
        return format(value.quantize(Decimal("1")), "f")
    return format(value.normalize(), "f")


def notify_stock_attention(*, product_id):
    product = (
        Product.objects.select_related("business")
        .filter(id=product_id, is_active=True)
        .first()
    )
    if product is None:
        return

    latest_movement = product.movements.order_by("-occurred_at", "-created_at").first()
    if latest_movement is None:
        return

    current_quantity = product.current_quantity
    previous_quantity = current_quantity - latest_movement.quantity_delta
    template = None
    if (
        current_quantity == 0
        and previous_quantity > 0
        and product.movements.filter(kind=InventoryMovement.Kind.RECEIPT).exists()
    ):
        template = UserNotification.Template.COMMERCE_SOLD_OUT
    elif (
        current_quantity > 0
        and product.low_stock_threshold > 0
        and current_quantity <= product.low_stock_threshold
        and (previous_quantity > product.low_stock_threshold or previous_quantity <= 0)
    ):
        template = UserNotification.Template.COMMERCE_LOW_STOCK
    if template is None:
        return

    business = product.business
    context = {
        "item_name": product.name,
        "sku": product.sku,
        "quantity": _quantity_text(current_quantity),
        "unit": product.unit,
        "threshold": _quantity_text(product.low_stock_threshold),
    }
    memberships = BusinessMembership.objects.select_related("user").filter(
        business=business,
        status=BusinessMembership.Status.ACTIVE,
    )
    for membership in memberships:
        if not role_has_permission(membership.role, WorkspacePermission.VIEW_COMMERCE):
            continue
        notify_user(
            user=membership.user,
            category=UserNotification.Category.WORKSPACE,
            template=template,
            context=context,
            action_path=f"/workspace/{business.id}/commerce/inventory",
            deduplication_key=(
                f"commerce:{template}:{product.id}:{latest_movement.id}"
            ),
            scope=UserNotification.Scope.WORKSPACE,
            business_id=business.id,
        )


@receiver(post_save, sender=InventoryMovement)
def queue_stock_attention_notification(sender, instance, created, **kwargs):
    if not created:
        return
    product_id = instance.product_id
    transaction.on_commit(lambda: notify_stock_attention(product_id=product_id))
