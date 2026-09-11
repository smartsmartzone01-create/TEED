from common.responses import SuccessResponse
from django.utils.decorators import method_decorator
from django.views.decorators.csrf import csrf_protect
from rest_framework import serializers
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
from .models import Product, ProductFamily, UnitDefinition
from .services import active_catalog_products, set_catalog_product_active
from .variant_options import normalize_variant_options


class CatalogProductSerializer(AvailabilityProductSerializer):
    family = serializers.SerializerMethodField()
    family_name = serializers.SerializerMethodField()
    variant_options = serializers.SerializerMethodField()

    class Meta(AvailabilityProductSerializer.Meta):
        fields = [
            *AvailabilityProductSerializer.Meta.fields,
            "family",
            "family_name",
            "variant_options",
        ]

    def get_family(self, obj):
        return str(obj.family_id) if obj.family_id else None

    def get_family_name(self, obj):
        return obj.family.name if obj.family_id else ""

    def get_variant_options(self, obj):
        return normalize_variant_options(obj.variant_options)


class ActiveProductListCreatePolishAPIView(ProductListCreatePolishAPIView):
    """Expose active catalog identities and product families for stock recording."""

    def get(self, request, business_id):
        membership = commerce_membership(user=request.user, business_id=business_id)
        products = active_catalog_products(business=membership.business)
        families = ProductFamily.objects.filter(
            business=membership.business,
            is_active=True,
        ).order_by("name", "brand", "id")
        return SuccessResponse(
            message="Products retrieved successfully.",
            data={
                "products": CatalogProductSerializer(products, many=True).data,
                "families": [
                    {
                        "id": str(family.id),
                        "name": family.name,
                        "brand": family.brand,
                    }
                    for family in families
                ],
            },
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
                data=CatalogProductSerializer(product).data,
            )

        membership = commerce_membership(
            user=request.user,
            business_id=business_id,
            permission=WorkspacePermission.MANAGE_CATALOG,
        )
        product = Product.objects.select_related("family").filter(
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
            data=CatalogProductSerializer(product).data,
        )


__all__ = [
    "ActiveProductListCreatePolishAPIView",
    "CatalogProductSerializer",
    "ProductDetailOperationsPolishAPIView",
    "UnitDefinition",
    "UnitDefinitionSerializer",
]
