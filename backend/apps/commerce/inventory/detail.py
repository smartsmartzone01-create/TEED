from common.responses import SuccessResponse
from django.utils.decorators import method_decorator
from django.views.decorators.csrf import csrf_protect
from rest_framework.exceptions import ValidationError

from ..api import CommerceBaseAPIView
from ..models import StockReceipt
from ..serializers import StockReceiptUpdateSerializer
from ..services import update_stock_receipt_details
from .stock import (
    PolishedStockReceiptSerializer,
    StockReceiptCorrectionSerializer,
    _assert_receipt_editable,
    correct_stock_receipt,
)


class GuardedStockReceiptDetailAPIView(CommerceBaseAPIView):
    @method_decorator(csrf_protect)
    def patch(self, request, business_id, receipt_id):
        receipt = StockReceipt.objects.filter(
            id=receipt_id, business_id=business_id
        ).first()
        if receipt is None:
            raise ValidationError({"receipt": ["Stock receipt not found."]})
        _assert_receipt_editable(receipt)

        if "lines" in request.data:
            serializer = StockReceiptCorrectionSerializer(
                data=request.data, partial=True
            )
            serializer.is_valid(raise_exception=True)
            receipt = correct_stock_receipt(
                actor=request.user,
                business_id=business_id,
                receipt_id=receipt_id,
                **serializer.validated_data,
            )
            message = "Stock correction saved successfully."
        else:
            serializer = StockReceiptUpdateSerializer(data=request.data, partial=True)
            serializer.is_valid(raise_exception=True)
            receipt = update_stock_receipt_details(
                actor=request.user,
                business_id=business_id,
                receipt_id=receipt_id,
                **serializer.validated_data,
            )
            message = "Stock details updated successfully."

        return SuccessResponse(
            message=message,
            data=PolishedStockReceiptSerializer(receipt).data,
        )
