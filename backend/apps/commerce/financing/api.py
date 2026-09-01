from common.responses import SuccessResponse
from django.http import FileResponse
from django.utils.decorators import method_decorator
from django.views.decorators.csrf import csrf_protect
from rest_framework import status
from rest_framework.parsers import FormParser, MultiPartParser

from apps.workspaces.policy import WorkspacePermission, role_has_permission

from ..api import CommerceBaseAPIView
from ..catalog.models import Product
from ..inventory.models import StockBatch, TrackedUnit
from ..services import commerce_membership
from .models import FinancingAgreement, FinancingDocument
from .serializers import (
    FinancingAgreementCreateSerializer,
    FinancingAgreementSerializer,
    FinancingDocumentSerializer,
    FinancingPaymentCreateSerializer,
    FinancingPaymentSerializer,
)
from .services import (
    attach_financing_document,
    create_financing_agreement,
    record_financing_payment,
    require_financing_document_access,
    sync_financing_due_notifications,
)


def _agreement_queryset(business):
    return (
        FinancingAgreement.objects.filter(business=business)
        .select_related("recorded_by")
        .prefetch_related(
            "items__product",
            "items__tracked_unit",
            "payments",
            "documents",
        )
    )


def _can_view_internal(membership):
    return role_has_permission(membership.role, WorkspacePermission.MANAGE_FINANCE)


def _effective_unit_cost(stock_line):
    return (stock_line.unit_cost or 0) + (
        stock_line.additional_cost / stock_line.quantity_received
    )


class FinancingAvailabilityAPIView(CommerceBaseAPIView):
    def get(self, request, business_id):
        membership = commerce_membership(
            user=request.user,
            business_id=business_id,
            permission=WorkspacePermission.VIEW_FINANCING,
        )
        show_internal = _can_view_internal(membership)
        products = Product.objects.filter(
            business=membership.business,
            is_active=True,
            current_quantity__gt=0,
        ).order_by("name", "sku")
        quantity_costs_by_product = {}
        if show_internal:
            quantity_batches = (
                StockBatch.objects.filter(
                    product__business=membership.business,
                    product__is_active=True,
                    tracking_mode=Product.TrackingMode.QUANTITY,
                    quantity_remaining__gt=0,
                )
                .order_by("product_id", "received_at", "created_at")
            )
            for batch in quantity_batches:
                quantity_costs_by_product.setdefault(
                    str(batch.product_id), str(_effective_unit_cost(batch))
                )
        units = (
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
        for unit in units:
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
            payload = {
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
            if show_internal:
                payload["acquisition_unit_cost"] = str(
                    _effective_unit_cost(unit.stock_line)
                )
            units_by_product.setdefault(str(unit.product_id), []).append(payload)
        return SuccessResponse(
            message="Financing availability retrieved successfully.",
            data={
                "products": [
                    {
                        "id": str(product.id),
                        "name": product.name,
                        "sku": product.sku,
                        "unit": product.unit,
                        "tracking_mode": product.tracking_mode,
                        "current_quantity": str(product.current_quantity),
                        "selling_price": str(product.selling_price)
                        if product.selling_price is not None
                        else None,
                        **(
                            {
                                "acquisition_unit_cost": quantity_costs_by_product[
                                    str(product.id)
                                ]
                            }
                            if str(product.id) in quantity_costs_by_product
                            else {}
                        ),
                        "available_units": units_by_product.get(str(product.id), []),
                    }
                    for product in products
                ]
            },
        )


class FinancingAgreementListCreateAPIView(CommerceBaseAPIView):
    def get(self, request, business_id):
        membership = commerce_membership(
            user=request.user,
            business_id=business_id,
            permission=WorkspacePermission.VIEW_FINANCING,
        )
        sync_financing_due_notifications(actor=request.user, business_id=business_id)
        agreements = _agreement_queryset(membership.business)[:100]
        return SuccessResponse(
            message="Financing agreements retrieved successfully.",
            data={
                "agreements": FinancingAgreementSerializer(
                    agreements,
                    many=True,
                    context={"show_internal": _can_view_internal(membership)},
                ).data
            },
        )

    @method_decorator(csrf_protect)
    def post(self, request, business_id):
        serializer = FinancingAgreementCreateSerializer(
            data=request.data, context={"business_id": business_id}
        )
        serializer.is_valid(raise_exception=True)
        agreement = create_financing_agreement(
            actor=request.user,
            business_id=business_id,
            **serializer.validated_data,
        )
        membership = commerce_membership(user=request.user, business_id=business_id)
        agreement = _agreement_queryset(agreement.business).get(pk=agreement.pk)
        return SuccessResponse(
            message="Financing agreement recorded successfully.",
            data=FinancingAgreementSerializer(
                agreement,
                context={"show_internal": _can_view_internal(membership)},
            ).data,
            status_code=status.HTTP_201_CREATED,
        )


class FinancingPaymentCreateAPIView(CommerceBaseAPIView):
    @method_decorator(csrf_protect)
    def post(self, request, business_id, agreement_id):
        serializer = FinancingPaymentCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        payment = record_financing_payment(
            actor=request.user,
            business_id=business_id,
            agreement_id=agreement_id,
            **serializer.validated_data,
        )
        return SuccessResponse(
            message="Financing payment recorded successfully.",
            data=FinancingPaymentSerializer(payment).data,
            status_code=status.HTTP_201_CREATED,
        )


class FinancingDocumentListCreateAPIView(CommerceBaseAPIView):
    parser_classes = [MultiPartParser, FormParser]

    def get(self, request, business_id, agreement_id):
        agreement = require_financing_document_access(
            user=request.user,
            business_id=business_id,
            agreement_id=agreement_id,
        )
        return SuccessResponse(
            message="Financing documents retrieved successfully.",
            data={
                "documents": FinancingDocumentSerializer(
                    agreement.documents.all(), many=True
                ).data
            },
        )

    @method_decorator(csrf_protect)
    def post(self, request, business_id, agreement_id):
        uploaded = request.FILES.get("file")
        if uploaded is None:
            from rest_framework.exceptions import ValidationError

            raise ValidationError({"file": ["Choose a document to upload."]})
        document = attach_financing_document(
            actor=request.user,
            business_id=business_id,
            agreement_id=agreement_id,
            file=uploaded,
            description=request.data.get("description", ""),
        )
        return SuccessResponse(
            message="Financing document uploaded successfully.",
            data=FinancingDocumentSerializer(document).data,
            status_code=status.HTTP_201_CREATED,
        )


class FinancingDocumentDownloadAPIView(CommerceBaseAPIView):
    def get(self, request, business_id, agreement_id, document_id):
        agreement = require_financing_document_access(
            user=request.user,
            business_id=business_id,
            agreement_id=agreement_id,
        )
        document = FinancingDocument.objects.filter(
            id=document_id, agreement=agreement
        ).first()
        if document is None:
            from rest_framework.exceptions import ValidationError

            raise ValidationError({"document_id": ["Financing document not found."]})
        return FileResponse(
            document.file.open("rb"),
            as_attachment=True,
            filename=document.original_name,
        )


__all__ = [
    "FinancingAgreementListCreateAPIView",
    "FinancingAvailabilityAPIView",
    "FinancingDocumentDownloadAPIView",
    "FinancingDocumentListCreateAPIView",
    "FinancingPaymentCreateAPIView",
]
