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
        products = Product.objects.filter(
            business=membership.business,
            is_active=True,
            current_quantity__gt=0,
        ).order_by("name", "sku")
        available_units = (
            TrackedUnit.objects.filter(
                product__business=membership.business,
                product__is_active=True,
                status=TrackedUnit.Status.AVAILABLE,
            )
            .select_related("product", "stock_line")
            .prefetch_related("identifiers")
            .order_by("product__name", "internal_serial")
        )
        units_by_product = {}
        for unit in available_units:
            units_by_product.setdefault(str(unit.product_id), []).append(
                {
                    "id": str(unit.id),
                    "internal_serial": unit.internal_serial,
                    "model_name": unit.model_name,
                    "brand": unit.brand,
                    "color": unit.color,
                    "capacity": unit.capacity,
                    "identifiers": [
                        {"kind": identifier.kind, "value": identifier.value}
                        for identifier in unit.identifiers.all()
                    ],
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
        return SuccessResponse(
            message="Sale availability retrieved successfully.",
            data={"products": payload},
        )


class SaleListCreateAPIView(CommerceBaseAPIView):
    def get(self, request, business_id):
        membership = commerce_membership(user=request.user, business_id=business_id)
        sales = (
            Sale.objects.filter(business=membership.business, status=Sale.Status.ACTIVE)
            .select_related("recorded_by")
            .prefetch_related("items__product", "items__tracked_unit__identifiers")[:100]
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
        serializer = SaleCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        sale = record_sale(
            actor=request.user, business_id=business_id, **serializer.validated_data
        )
        sale = (
            Sale.objects.prefetch_related(
                "items__product", "items__tracked_unit__identifiers"
            )
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
        serializer = SaleCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        sale = edit_sale(
            actor=request.user,
            business_id=business_id,
            sale_id=sale_id,
            **serializer.validated_data,
        )
        sale = Sale.objects.prefetch_related(
            "items__product", "items__tracked_unit__identifiers"
        ).get(pk=sale.pk)
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
