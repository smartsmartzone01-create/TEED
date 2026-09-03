from common.responses import SuccessResponse
from django.utils.decorators import method_decorator
from django.views.decorators.csrf import csrf_protect
from rest_framework import status

from apps.workspaces.policy import WorkspacePermission, role_has_permission

from ..api import CommerceBaseAPIView
from ..catalog.models import Product
from ..inventory.models import TrackedUnit
from ..services import commerce_membership
from .models import Sale
from .serializers import SaleCreateSerializer, SaleSerializer, SaleVoidSerializer
from .services import edit_sale, record_sale, void_sale


class SaleAvailabilityAPIView(CommerceBaseAPIView):
    def get(self, request, business_id):
        membership = commerce_membership(user=request.user, business_id=business_id)
        all_products = Product.objects.filter(
            business=membership.business,
            is_active=True,
        ).order_by("name", "sku")
        products = all_products.filter(current_quantity__gt=0)
        available_units = (
            TrackedUnit.objects.filter(
                product__business=membership.business,
                product__is_active=True,
                status=TrackedUnit.Status.AVAILABLE,
                stock_line__quantity_remaining__gt=0,
            )
            .select_related(
                "product",
                "stock_line",
                "stock_line__receipt",
                "stock_line__stock_group",
                "stock_line__stock_group__batch",
            )
            .prefetch_related("identifiers")
            .order_by("product__name", "internal_serial")
        )
        units_by_product = {}
        for unit in available_units:
            identifiers = [
                {"kind": identifier.kind, "value": identifier.value}
                for identifier in unit.identifiers.all()
            ]
            if unit.imei and not any(item["kind"] == "imei" for item in identifiers):
                identifiers.append({"kind": "imei", "value": unit.imei})
            if unit.serial_number and not any(
                item["kind"] == "serial" for item in identifiers
            ):
                identifiers.append({"kind": "serial", "value": unit.serial_number})
            group = unit.stock_line.stock_group
            units_by_product.setdefault(str(unit.product_id), []).append(
                {
                    "id": str(unit.id),
                    "internal_serial": unit.internal_serial,
                    "model_name": unit.model_name,
                    "brand": unit.brand,
                    "color": unit.color,
                    "capacity": unit.capacity,
                    "identifiers": identifiers,
                    "stock_reference": (
                        unit.stock_line.receipt.reference
                        if unit.stock_line.receipt_id
                        else unit.stock_line.reference
                    ),
                    "batch_name": group.batch.name if group else "",
                    "group_name": group.name if group else "",
                }
            )
        payload = [
            {
                "id": str(product.id),
                "name": product.name,
                "sku": product.sku,
                "brand": product.brand,
                "variant": product.variant,
                "unit": product.unit,
                "tracking_mode": product.tracking_mode,
                "current_quantity": str(product.current_quantity),
                "selling_price": (
                    str(product.selling_price)
                    if product.selling_price is not None
                    else None
                ),
                "available_units": units_by_product.get(str(product.id), []),
            }
            for product in products
        ]
        stock_targets = [
            {
                "id": str(product.id),
                "name": product.name,
                "sku": product.sku,
                "brand": product.brand,
                "variant": product.variant,
                "unit": product.unit,
            }
            for product in all_products
        ]
        return SuccessResponse(
            message="Sale availability retrieved successfully.",
            data={"products": payload, "stock_targets": stock_targets},
        )


class SaleListCreateAPIView(CommerceBaseAPIView):
    def get(self, request, business_id):
        membership = commerce_membership(user=request.user, business_id=business_id)
        sales = (
            Sale.objects.filter(business=membership.business, status=Sale.Status.ACTIVE)
            .select_related(
                "recorded_by",
                "trade_in_detail",
                "trade_in_detail__stock_product",
                "trade_in_detail__stock_receipt",
            )
            .prefetch_related("items__product", "items__tracked_unit__identifiers")[
                :100
            ]
        )
        return SuccessResponse(
            message="Sales retrieved successfully.",
            data={
                "sales": SaleSerializer(
                    sales,
                    many=True,
                    context={
                        "show_costs": role_has_permission(
                            membership.role, WorkspacePermission.MANAGE_FINANCE
                        )
                    },
                ).data
            },
        )

    @method_decorator(csrf_protect)
    def post(self, request, business_id):
        serializer = SaleCreateSerializer(
            data=request.data, context={"business_id": business_id}
        )
        serializer.is_valid(raise_exception=True)
        sale = record_sale(
            actor=request.user, business_id=business_id, **serializer.validated_data
        )
        sale = (
            Sale.objects.select_related(
                "trade_in_detail",
                "trade_in_detail__stock_product",
                "trade_in_detail__stock_receipt",
            )
            .prefetch_related("items__product", "items__tracked_unit__identifiers")
            .get(pk=sale.pk)
        )
        return SuccessResponse(
            message="Sale recorded successfully.",
            data=SaleSerializer(sale).data,
            status_code=status.HTTP_201_CREATED,
        )


class SaleDetailAPIView(CommerceBaseAPIView):
    @method_decorator(csrf_protect)
    def patch(self, request, business_id, sale_id):
        serializer = SaleCreateSerializer(
            data=request.data, context={"business_id": business_id}
        )
        serializer.is_valid(raise_exception=True)
        sale = edit_sale(
            actor=request.user,
            business_id=business_id,
            sale_id=sale_id,
            **serializer.validated_data,
        )
        sale = (
            Sale.objects.select_related(
                "trade_in_detail",
                "trade_in_detail__stock_product",
                "trade_in_detail__stock_receipt",
            )
            .prefetch_related("items__product", "items__tracked_unit__identifiers")
            .get(pk=sale.pk)
        )
        return SuccessResponse(
            message="Sale corrected successfully.", data=SaleSerializer(sale).data
        )


class SaleVoidAPIView(CommerceBaseAPIView):
    @method_decorator(csrf_protect)
    def post(self, request, business_id, sale_id):
        serializer = SaleVoidSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        sale = void_sale(
            actor=request.user,
            business_id=business_id,
            sale_id=sale_id,
            **serializer.validated_data,
        )
        return SuccessResponse(
            message="Sale voided and archived successfully.",
            data=SaleSerializer(sale).data,
        )


__all__ = [
    "SaleAvailabilityAPIView",
    "SaleDetailAPIView",
    "SaleListCreateAPIView",
    "SaleVoidAPIView",
]
