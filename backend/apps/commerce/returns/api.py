from common.responses import SuccessResponse
from django.utils.decorators import method_decorator
from django.views.decorators.csrf import csrf_protect
from rest_framework import serializers, status

from ..api import CommerceBaseAPIView
from ..models import SaleReturn
from ..sales.serializers import SaleSerializer
from ..serializers import ReturnCreateSerializer, ReturnSerializer
from ..services import commerce_membership
from .selectors import returnable_sales_for_period
from .services import record_return


class ReturnLookupQuerySerializer(serializers.Serializer):
    sold_from = serializers.DateTimeField(required=False)
    sold_before = serializers.DateTimeField(required=False)
    receipt_number = serializers.CharField(
        max_length=40,
        required=False,
        allow_blank=True,
        trim_whitespace=True,
    )

    def validate(self, attrs):
        sold_from = attrs.get("sold_from")
        sold_before = attrs.get("sold_before")
        if sold_from and sold_before and sold_from >= sold_before:
            raise serializers.ValidationError(
                {"sold_before": "The end of the sale period must be after its start."}
            )
        return attrs


class ReturnListCreateAPIView(CommerceBaseAPIView):
    def get(self, request, business_id):
        membership = commerce_membership(user=request.user, business_id=business_id)
        query = ReturnLookupQuerySerializer(data=request.query_params)
        query.is_valid(raise_exception=True)

        records = (
            SaleReturn.objects.select_related("sale")
            .filter(sale__business=membership.business)
            .order_by("-returned_at", "-created_at")[:100]
        )
        filters = query.validated_data
        sales = []
        if (
            filters.get("sold_from") is not None
            or filters.get("sold_before") is not None
            or filters.get("receipt_number")
        ):
            sales = returnable_sales_for_period(
                business=membership.business,
                sold_from=filters.get("sold_from"),
                sold_before=filters.get("sold_before"),
                receipt_number=filters.get("receipt_number", ""),
            )

        return SuccessResponse(
            message="Returns workspace retrieved successfully.",
            data={
                "returns": ReturnSerializer(records, many=True).data,
                "sales": SaleSerializer(sales, many=True).data,
            },
        )

    @method_decorator(csrf_protect)
    def post(self, request, business_id):
        serializer = ReturnCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        record = record_return(
            actor=request.user,
            business_id=business_id,
            **serializer.validated_data,
        )
        return SuccessResponse(
            message="Return recorded successfully.",
            data=ReturnSerializer(record).data,
            status_code=status.HTTP_201_CREATED,
        )


__all__ = ["ReturnListCreateAPIView"]
