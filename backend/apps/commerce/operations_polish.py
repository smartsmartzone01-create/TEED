from common.responses import SuccessResponse
from django.db import transaction
from django.utils.decorators import method_decorator
from django.views.decorators.csrf import csrf_protect
from rest_framework.exceptions import ValidationError

from apps.workspaces.policy import WorkspacePermission

from .api import CommerceBaseAPIView
from .models import Product, StockReceipt, UnitDefinition
from .serializers import UnitDefinitionSerializer
from .services import commerce_membership
from .stock_polish import (
    AvailabilityProductSerializer,
    PolishedStockReceiptSerializer,
    ProductDetailPolishAPIView,
    ProductListCreatePolishAPIView,
    StockReceiptListCreatePolishAPIView,
)


def active_catalog_products(*, business):
    return Product.objects.filter(business=business, is_active=True)


def current_stock_receipts(*, business):
    return StockReceipt.objects.filter(
        business=business,
        parent_receipt__isnull=True,
        status__in=[StockReceipt.Status.DRAFT, StockReceipt.Status.RECEIVED],
    )


@transaction.atomic
def set_catalog_product_active(*, actor, business_id, product_id, is_active):
    membership = commerce_membership(
        user=actor,
        business_id=business_id,
        permission=WorkspacePermission.MANAGE_CATALOG,
    )
    product = (
        Product.objects.select_for_update()
        .filter(id=product_id, business=membership.business)
        .first()
    )
    if product is None:
        raise ValidationError({"product": ["Item not found."]})
    if not is_active and product.current_quantity > 0:
        raise ValidationError(
            {"is_active": ["An item with available stock cannot be archived."]}
        )
    product.is_active = is_active
    product.save(update_fields=["is_active", "updated_at"])
    return product


@transaction.atomic
def archive_draft_stock_receipt(*, actor, business_id, receipt_id):
    membership = commerce_membership(
        user=actor,
        business_id=business_id,
        permission=WorkspacePermission.MANAGE_INVENTORY,
    )
    receipt = (
        StockReceipt.objects.select_for_update()
        .filter(id=receipt_id, business=membership.business)
        .first()
    )
    if receipt is None:
        raise ValidationError({"receipt": ["Stock receipt not found."]})
    if receipt.status != StockReceipt.Status.DRAFT:
        raise ValidationError(
            {"receipt": ["Received stock cannot be removed or archived."]}
        )
    receipt.status = StockReceipt.Status.ARCHIVED
    receipt.save(update_fields=["status", "updated_at"])
    return receipt


class ActiveProductListCreatePolishAPIView(ProductListCreatePolishAPIView):
    """Expose active catalog identities, including sold-out items for restocking."""

    def get(self, request, business_id):
        membership = commerce_membership(user=request.user, business_id=business_id)
        products = active_catalog_products(business=membership.business)
        return SuccessResponse(
            message="Products retrieved successfully.",
            data={"products": AvailabilityProductSerializer(products, many=True).data},
        )


class ProductDetailOperationsPolishAPIView(ProductDetailPolishAPIView):
    """Keep catalog archive/reactivation rules explicit and reusable."""

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
        return super().patch(request, business_id, product_id)


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
