from common.responses import SuccessResponse
from django.utils.decorators import method_decorator
from django.views.decorators.csrf import csrf_protect
from rest_framework import serializers, status
from rest_framework.exceptions import ValidationError

from apps.workspaces.policy import WorkspacePermission

from ..api import CommerceBaseAPIView
from ..inventory.stock import AvailabilityProductSerializer
from ..serializers import UnitDefinitionSerializer
from ..services import commerce_membership, create_product
from .models import Product, ProductFamily, UnitDefinition
from .services import active_catalog_products, set_catalog_product_active
from .variant_options import normalize_variant_options, variant_display_name


def _family_for_business(*, business, family_id):
    if family_id in (None, ""):
        return None
    family = ProductFamily.objects.filter(
        id=family_id,
        business=business,
        is_active=True,
    ).first()
    if family is None:
        raise serializers.ValidationError(
            {"family_id": ["Select an active product family from this workspace."]}
        )
    return family


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


class CatalogProductCreateSerializer(serializers.Serializer):
    family_id = serializers.UUIDField(required=False, allow_null=True)
    name = serializers.CharField(max_length=120, required=False, allow_blank=True)
    barcode = serializers.CharField(max_length=80, required=False, allow_blank=True, default="")
    brand = serializers.CharField(max_length=80, required=False, allow_blank=True, default="")
    variant = serializers.CharField(max_length=120, required=False, allow_blank=True, default="")
    variant_options = serializers.JSONField(required=False, default=list)
    unit = serializers.CharField(max_length=32, default="piece")
    selling_price = serializers.DecimalField(
        max_digits=14,
        decimal_places=2,
        min_value=0,
        required=False,
        allow_null=True,
    )
    tracking_mode = serializers.ChoiceField(
        choices=Product.TrackingMode.choices,
        default=Product.TrackingMode.QUANTITY,
    )
    low_stock_threshold = serializers.DecimalField(
        max_digits=14,
        decimal_places=3,
        min_value=0,
        required=False,
        default=0,
    )

    def validate_variant_options(self, value):
        return normalize_variant_options(value)

    def validate(self, attrs):
        business = self.context["business"]
        family = _family_for_business(
            business=business,
            family_id=attrs.pop("family_id", None),
        )
        attrs["family"] = family

        options = attrs.get("variant_options", [])
        if options:
            attrs["variant"] = variant_display_name(options)[:120]

        name = attrs.get("name", "").strip()
        if family is not None:
            attrs["name"] = name or family.name
            if not attrs.get("brand"):
                attrs["brand"] = family.brand
        elif not name:
            raise serializers.ValidationError(
                {"name": ["Enter a product name for a standalone product."]}
            )
        else:
            attrs["name"] = name

        return attrs


class CatalogProductCorrectionSerializer(serializers.ModelSerializer):
    family_id = serializers.UUIDField(required=False, allow_null=True, write_only=True)
    variant_options = serializers.JSONField(required=False)

    class Meta:
        model = Product
        fields = [
            "family_id",
            "name",
            "barcode",
            "brand",
            "variant",
            "variant_options",
            "unit",
            "selling_price",
            "tracking_mode",
            "low_stock_threshold",
            "is_active",
        ]

    def validate_variant_options(self, value):
        return normalize_variant_options(value)

    def validate(self, attrs):
        attrs = super().validate(attrs)
        if "family_id" in attrs:
            attrs["family"] = _family_for_business(
                business=self.context["business"],
                family_id=attrs.pop("family_id"),
            )
        options = attrs.get("variant_options")
        if options:
            attrs["variant"] = variant_display_name(options)[:120]
        return attrs


class ActiveProductListCreatePolishAPIView(CommerceBaseAPIView):
    """Expose and create canonical catalog identities for Stock v2 and catalog UI."""

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

    @method_decorator(csrf_protect)
    def post(self, request, business_id):
        membership = commerce_membership(
            user=request.user,
            business_id=business_id,
            permission=WorkspacePermission.MANAGE_CATALOG,
        )
        serializer = CatalogProductCreateSerializer(
            data=request.data,
            context={"business": membership.business},
        )
        serializer.is_valid(raise_exception=True)
        product = create_product(
            actor=request.user,
            business_id=business_id,
            **serializer.validated_data,
        )
        product = Product.objects.select_related("family").get(pk=product.pk)
        return SuccessResponse(
            message="Catalog SKU created successfully.",
            data=CatalogProductSerializer(product).data,
            status_code=status.HTTP_201_CREATED,
        )


class ProductDetailOperationsPolishAPIView(CommerceBaseAPIView):
    """Correct catalog metadata while protecting inventory-sensitive SKU policy."""

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
            id=product_id,
            business=membership.business,
        ).first()
        if product is None:
            raise ValidationError({"product": ["Item not found."]})

        serializer = CatalogProductCorrectionSerializer(
            product,
            data=request.data,
            partial=True,
            context={"business": membership.business},
        )
        serializer.is_valid(raise_exception=True)

        has_history = (
            product.stock_batches.exists()
            or product.movements.exists()
            or product.sale_items.exists()
        )
        new_unit = serializer.validated_data.get("unit", product.unit)
        if new_unit.casefold() != product.unit.casefold() and has_history:
            raise ValidationError(
                {
                    "unit": [
                        "This SKU already has stock history. Correct its unit from the "
                        "original stock receipt while that receipt is inside its 48-hour "
                        "correction window."
                    ]
                }
            )
        new_tracking_mode = serializer.validated_data.get(
            "tracking_mode",
            product.tracking_mode,
        )
        if new_tracking_mode != product.tracking_mode and has_history:
            raise ValidationError(
                {
                    "tracking_mode": [
                        "This SKU already has inventory history, so its tracking mode "
                        "cannot be changed. Create another SKU if a different tracking "
                        "policy is required."
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
            message="Catalog SKU updated successfully.",
            data=CatalogProductSerializer(product).data,
        )


__all__ = [
    "ActiveProductListCreatePolishAPIView",
    "CatalogProductSerializer",
    "ProductDetailOperationsPolishAPIView",
    "UnitDefinition",
    "UnitDefinitionSerializer",
]
