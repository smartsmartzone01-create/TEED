from django.db import transaction
from rest_framework.exceptions import ValidationError

from apps.workspaces.policy import WorkspacePermission

from ..services import commerce_membership
from .models import StockReceipt


def current_stock_receipts(*, business):
    return StockReceipt.objects.filter(
        business=business,
        parent_receipt__isnull=True,
        status__in=[StockReceipt.Status.DRAFT, StockReceipt.Status.RECEIVED],
    )


@transaction.atomic
def archive_draft_stock_receipt(*, actor, business_id, receipt_id):
    membership = commerce_membership(
        user=actor,
        business_id=business_id,
        permission=WorkspacePermission.MANAGE_INVENTORY,
    )
    receipt = (
        StockReceipt.objects.select_for_update()
        .filter(id=receipt_id, business=membership.business)
        .first()
    )
    if receipt is None:
        raise ValidationError({"receipt": ["Stock receipt not found."]})
    if receipt.status != StockReceipt.Status.DRAFT:
        raise ValidationError(
            {"receipt": ["Received stock cannot be removed or archived."]}
        )
    receipt.status = StockReceipt.Status.ARCHIVED
    receipt.save(update_fields=["status", "updated_at"])
    return receipt
