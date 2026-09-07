from common.responses import SuccessResponse
from django.utils.decorators import method_decorator
from django.views.decorators.csrf import csrf_protect
from rest_framework.exceptions import ValidationError

from ..api import CommerceBaseAPIView
from ..models import StockReceipt, StockReceiptAudit
from .contract import CanonicalStockReceiptCorrectionContractSerializer
from .corrections import correct_stock_structure
from .serializers import CanonicalStockReceiptSerializer
from .stock import _assert_receipt_editable


class GuardedStockReceiptDetailAPIView(CommerceBaseAPIView):
    @method_decorator(csrf_protect)
    def patch(self, request, business_id, receipt_id):
        receipt = StockReceipt.objects.filter(
            id=receipt_id, business_id=business_id
        ).first()
        if receipt is None:
            raise ValidationError({"receipt": ["Stock receipt not found."]})
        _assert_receipt_editable(receipt)

        serializer = CanonicalStockReceiptCorrectionContractSerializer(
            data=request.data, partial=True
        )
        serializer.is_valid(raise_exception=True)
        previous_name = receipt.name
        receipt = correct_stock_structure(
            actor=request.user,
            business_id=business_id,
            receipt_id=receipt_id,
            **serializer.validated_data,
        )
        if "name" in serializer.validated_data:
            next_name = serializer.validated_data["name"].strip()
            if next_name != previous_name:
                receipt.name = next_name
                receipt.save(update_fields=["name", "updated_at"])
                StockReceiptAudit.objects.create(
                    receipt=receipt,
                    actor=request.user,
                    action="edit_details",
                    before={"name": previous_name},
                    after={"name": next_name},
                )
        receipt = StockReceipt.objects.prefetch_related(
            "lines__product__family",
            "lines__tracked_units__identifiers",
            "batches__groups__type_lines__product__family",
            "batches__groups__type_lines__tracked_units__identifiers",
            "late_deliveries__lines__product__family",
            "late_deliveries__lines__tracked_units__identifiers",
            "late_deliveries__batches__groups__type_lines__product__family",
            "late_deliveries__batches__groups__type_lines__tracked_units__identifiers",
        ).get(pk=receipt.pk)
        return SuccessResponse(
            message="Stock correction saved successfully.",
            data=CanonicalStockReceiptSerializer(receipt).data,
        )
