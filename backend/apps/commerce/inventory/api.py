from common.responses import SuccessResponse
from django.utils.decorators import method_decorator
from django.views.decorators.csrf import csrf_protect

from ..api import (
    AdjustmentCreateAPIView,
    CommerceBaseAPIView,
    StockBatchListCreateAPIView,
    StockReceiptReceiveAPIView,
)
from ..catalog.models import UnitDefinition
from ..serializers import UnitDefinitionSerializer
from ..services import commerce_membership
from .detail import GuardedStockReceiptDetailAPIView
from .services import archive_draft_stock_receipt, current_stock_receipts
from .stock import PolishedStockReceiptSerializer, StockReceiptListCreatePolishAPIView


class ActiveStockReceiptListCreatePolishAPIView(StockReceiptListCreatePolishAPIView):
    """Keep archived drafts out of the current stock workspace."""

    def get(self, request, business_id):
        membership = commerce_membership(user=request.user, business_id=business_id)
        receipts = current_stock_receipts(business=membership.business).prefetch_related(
            "lines__product",
            "lines__tracked_units",
            "batches__groups__type_lines__product",
            "batches__groups__type_lines__tracked_units",
            "late_deliveries__lines__product",
            "late_deliveries__lines__tracked_units",
            "late_deliveries__batches__groups__type_lines__product",
            "late_deliveries__batches__groups__type_lines__tracked_units",
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


__all__ = [
    "ActiveStockReceiptListCreatePolishAPIView",
    "AdjustmentCreateAPIView",
    "GuardedStockReceiptArchiveAPIView",
    "GuardedStockReceiptDetailAPIView",
    "StockBatchListCreateAPIView",
    "StockReceiptReceiveAPIView",
]
