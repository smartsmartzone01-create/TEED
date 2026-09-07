from decimal import Decimal

from django.db import transaction
from django.db.models.signals import post_save, pre_save
from django.dispatch import receiver
from rest_framework.exceptions import ValidationError

from apps.notifications.models import UserNotification
from apps.notifications.services import notify_user
from apps.workspaces.models import BusinessMembership
from apps.workspaces.policy import WorkspacePermission, role_has_permission

from .models import InventoryMovement, Product, StockBatch


def _quantity_text(value):
    if value == value.to_integral_value():
        return format(value.quantize(Decimal("1")), "f")
    return format(value.normalize(), "f")


def _tracking_mode_name(mode):
    return "individually" if mode == Product.TrackingMode.INDIVIDUAL else "by quantity"


@receiver(pre_save, sender=StockBatch)
def enforce_sku_tracking_mode(sender, instance, **kwargs):
    """Keep every stock allocation aligned with its SKU tracking identity.

    Product.tracking_mode is authoritative. Existing historical rows are left untouched
    unless they are explicitly saved again; every new or edited StockBatch must match.
    """

    if not instance.product_id:
        return
    product = Product.objects.filter(pk=instance.product_id).first()
    if product is None:
        return

    requested_mode = instance.tracking_mode or product.tracking_mode
    if requested_mode != product.tracking_mode:
        raise ValidationError(
            {
                "tracking_mode": [
                    f"SKU {product.sku or product.name} is tracked "
                    f"{_tracking_mode_name(product.tracking_mode)} and cannot be recorded "
                    f"{_tracking_mode_name(requested_mode)}. Choose a compatible SKU or "
                    "use the SKU's existing recording method."
                ]
            }
        )
    instance.tracking_mode = product.tracking_mode


@receiver(pre_save, sender=Product)
def prevent_allocated_sku_tracking_rewrite(sender, instance, **kwargs):
    """Prevent ordinary edits from changing tracking identity after stock exists."""

    if not instance.pk:
        return
    previous_mode = (
        Product.objects.filter(pk=instance.pk)
        .values_list("tracking_mode", flat=True)
        .first()
    )
    if previous_mode is None or previous_mode == instance.tracking_mode:
        return
    if StockBatch.objects.filter(product_id=instance.pk).exists():
        raise ValidationError(
            {
                "tracking_mode": [
                    f"SKU {instance.sku or instance.name} already has stock recorded "
                    f"{_tracking_mode_name(previous_mode)}. Its tracking mode cannot be "
                    "changed while that SKU has stock history."
                ]
            }
        )


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
