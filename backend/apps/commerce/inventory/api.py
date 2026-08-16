from common.responses import SuccessResponse
from django.utils.decorators import method_decorator
from django.views.decorators.csrf import csrf_protect
from rest_framework import status

from ..api import (
    AdjustmentCreateAPIView,
    CommerceBaseAPIView,
    StockBatchListCreateAPIView,
    StockReceiptReceiveAPIView,
)
from ..catalog.models import UnitDefinition
from ..services import commerce_membership, create_stock_receipt
from .contract import CanonicalStockReceiptCreateContractSerializer
from .detail import GuardedStockReceiptDetailAPIView
from .serializers import (
    CanonicalStockReceiptSerializer,
    CanonicalUnitDefinitionSerializer,
)
from .services import archive_draft_stock_receipt, current_stock_receipts

PREFETCH_STOCK = (
    "lines__product",
    "lines__tracked_units__identifiers",
    "batches__groups__type_lines__product",
    "batches__groups__type_lines__tracked_units__identifiers",
    "late_deliveries__lines__product",
    "late_deliveries__lines__tracked_units__identifiers",
    "late_deliveries__batches__groups__type_lines__product",
    "late_deliveries__batches__groups__type_lines__tracked_units__identifiers",
)


class ActiveStockReceiptListCreatePolishAPIView(CommerceBaseAPIView):
    """Canonical Mzigo -> Batch -> Group -> Product stock endpoint."""

    def get(self, request, business_id):
        membership = commerce_membership(user=request.user, business_id=business_id)
        receipts = current_stock_receipts(
            business=membership.business
        ).prefetch_related(*PREFETCH_STOCK)
        return SuccessResponse(
            message="Stock received retrieved successfully.",
            data={
                "receipts": CanonicalStockReceiptSerializer(receipts, many=True).data,
                "units": CanonicalUnitDefinitionSerializer(
                    UnitDefinition.objects.filter(business=membership.business),
                    many=True,
                ).data,
            },
        )

    @method_decorator(csrf_protect)
    def post(self, request, business_id):
        serializer = CanonicalStockReceiptCreateContractSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        receipt = create_stock_receipt(
            actor=request.user,
            business_id=business_id,
            **serializer.validated_data,
        )
        receipt = receipt.__class__.objects.prefetch_related(*PREFETCH_STOCK).get(
            pk=receipt.pk
        )
        return SuccessResponse(
            message=(
                "Stock draft saved successfully."
                if receipt.status == receipt.Status.DRAFT
                else "Stock received successfully."
            ),
            data=CanonicalStockReceiptSerializer(receipt).data,
            status_code=status.HTTP_201_CREATED,
        )


class GuardedStockReceiptArchiveAPIView(CommerceBaseAPIView):
    @method_decorator(csrf_protect)
    def post(self, request, business_id, receipt_id):
        receipt = archive_draft_stock_receipt(
            actor=request.user,
            business_id=business_id,
            receipt_id=receipt_id,
        )
        return SuccessResponse(
            message="Draft stock archived successfully.",
            data=CanonicalStockReceiptSerializer(receipt).data,
        )


__all__ = [
    "ActiveStockReceiptListCreatePolishAPIView",
    "AdjustmentCreateAPIView",
    "GuardedStockReceiptArchiveAPIView",
    "GuardedStockReceiptDetailAPIView",
    "StockBatchListCreateAPIView",
    "StockReceiptReceiveAPIView",
]
