from common.responses import SuccessResponse
from django.db import transaction
from django.utils.decorators import method_decorator
from django.views.decorators.csrf import csrf_protect
from rest_framework.exceptions import ValidationError

from apps.workspaces.policy import WorkspacePermission

from .api import CommerceBaseAPIView
from .models import Product, StockReceipt, UnitDefinition
from .serializers import UnitDefinitionSerializer
from .services import commerce_membership
from .stock_polish import (
    AvailabilityProductSerializer,
    PolishedStockReceiptSerializer,
    ProductListCreatePolishAPIView,
    StockReceiptListCreatePolishAPIView,
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


class ActiveProductListCreatePolishAPIView(ProductListCreatePolishAPIView):
    """Expose active catalog identities, including sold-out items for restocking."""

    def get(self, request, business_id):
        membership = commerce_membership(user=request.user, business_id=business_id)
        products = Product.objects.filter(
            business=membership.business,
            is_active=True,
        )
        return SuccessResponse(
            message="Products retrieved successfully.",
            data={"products": AvailabilityProductSerializer(products, many=True).data},
        )


class ActiveStockReceiptListCreatePolishAPIView(StockReceiptListCreatePolishAPIView):
    """Keep archived drafts out of the current stock workspace."""

    def get(self, request, business_id):
        membership = commerce_membership(user=request.user, business_id=business_id)
        receipts = StockReceipt.objects.prefetch_related(
            "lines__product",
            "lines__tracked_units",
            "batches__groups__type_lines__product",
            "batches__groups__type_lines__tracked_units",
            "late_deliveries__lines__product",
            "late_deliveries__lines__tracked_units",
            "late_deliveries__batches__groups__type_lines__product",
            "late_deliveries__batches__groups__type_lines__tracked_units",
        ).filter(
            business=membership.business,
            parent_receipt__isnull=True,
            status__in=[StockReceipt.Status.DRAFT, StockReceipt.Status.RECEIVED],
        )
        return SuccessResponse(
            message="Stock received retrieved successfully.",
            data={
                "receipts": PolishedStockReceiptSerializer(receipts, many=True).data,
                "units": UnitDefinitionSerializer(
                    UnitDefinition.objects.filter(business=membership.business),
                    many=True,
                ).data,
            },
        )


class GuardedStockReceiptArchiveAPIView(CommerceBaseAPIView):
    """Only draft stock can leave the active workspace through archiving."""

    @method_decorator(csrf_protect)
    def post(self, request, business_id, receipt_id):
        receipt = archive_draft_stock_receipt(
            actor=request.user,
            business_id=business_id,
            receipt_id=receipt_id,
        )
        return SuccessResponse(
            message="Draft stock archived successfully.",
            data=PolishedStockReceiptSerializer(receipt).data,
        )
