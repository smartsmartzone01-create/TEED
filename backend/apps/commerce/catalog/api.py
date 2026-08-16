from common.responses import SuccessResponse
from django.utils.decorators import method_decorator
from django.views.decorators.csrf import csrf_protect
from rest_framework.exceptions import ValidationError

from apps.workspaces.policy import WorkspacePermission

from ..api import CommerceBaseAPIView
from ..inventory.stock import (
    AvailabilityProductSerializer,
    ProductCorrectionSerializer,
    ProductListCreatePolishAPIView,
)
from ..serializers import UnitDefinitionSerializer
from ..services import commerce_membership
from .models import Product, UnitDefinition
from .services import active_catalog_products, set_catalog_product_active


class ActiveProductListCreatePolishAPIView(ProductListCreatePolishAPIView):
    """Expose active catalog identities, including sold-out items for restocking."""

    def get(self, request, business_id):
        membership = commerce_membership(user=request.user, business_id=business_id)
        products = active_catalog_products(business=membership.business)
        return SuccessResponse(
            message="Products retrieved successfully.",
            data={"products": AvailabilityProductSerializer(products, many=True).data},
        )


class ProductDetailOperationsPolishAPIView(CommerceBaseAPIView):
    """Correct metadata while keeping catalog archive rules explicit."""

    @method_decorator(csrf_protect)
    def patch(self, request, business_id, product_id):
        if set(request.data) == {"is_active"}:
            is_active = request.data.get("is_active")
            if not isinstance(is_active, bool):
                raise ValidationError({"is_active": ["Enter true or false."]})
            product = set_catalog_product_active(
                actor=request.user,
                business_id=business_id,
                product_id=product_id,
                is_active=is_active,
            )
            return SuccessResponse(
                message="Catalog item status updated successfully.",
                data=AvailabilityProductSerializer(product).data,
            )

        membership = commerce_membership(
            user=request.user,
            business_id=business_id,
            permission=WorkspacePermission.MANAGE_CATALOG,
        )
        product = Product.objects.filter(
            id=product_id, business=membership.business
        ).first()
        if product is None:
            raise ValidationError({"product": ["Item not found."]})
        serializer = ProductCorrectionSerializer(
            product, data=request.data, partial=True
        )
        serializer.is_valid(raise_exception=True)
        new_unit = serializer.validated_data.get("unit", product.unit)
        if new_unit.casefold() != product.unit.casefold() and (
            product.stock_batches.exists()
            or product.movements.exists()
            or product.sale_items.exists()
        ):
            raise ValidationError(
                {
                    "unit": [
                        "This item already has stock history. Correct its unit from the "
                        "original stock receipt while that receipt is inside its 48-hour "
                        "correction window."
                    ]
                }
            )
        if (
            serializer.validated_data.get("is_active") is False
            and product.current_quantity > 0
        ):
            raise ValidationError(
                {"is_active": ["An item with available stock cannot be archived."]}
            )
        product = serializer.save()
        return SuccessResponse(
            message="Available item corrected successfully.",
            data=AvailabilityProductSerializer(product).data,
        )


__all__ = [
    "ActiveProductListCreatePolishAPIView",
    "ProductDetailOperationsPolishAPIView",
    "UnitDefinition",
    "UnitDefinitionSerializer",
]
