import calendar
from datetime import timedelta
from decimal import Decimal

from django.db import transaction
from django.db.models import F, Max
from django.utils import timezone
from rest_framework.exceptions import PermissionDenied, ValidationError

from apps.notifications.models import UserNotification
from apps.notifications.services import notify_user
from apps.workspaces.policy import WorkspacePermission, role_has_permission

from ..catalog.models import Product
from ..inventory.models import StockBatch, TrackedUnit
from ..services import commerce_membership
from .models import (
    FinancingAgreement,
    FinancingAllocation,
    FinancingDocument,
    FinancingItem,
    FinancingPayment,
)


def _effective_batch_unit_cost(batch):
    return (batch.unit_cost or Decimal("0")) + (
        batch.additional_cost / batch.quantity_received
    )


def _allocate_fifo(*, financing_item, product, quantity):
    remaining = quantity
    cost_total = Decimal("0")
    batches = (
        StockBatch.objects.select_for_update()
        .filter(
            product=product,
            tracking_mode=Product.TrackingMode.QUANTITY,
            quantity_remaining__gt=0,
        )
        .order_by("received_at", "created_at")
    )
    for batch in batches:
        allocated = min(remaining, batch.quantity_remaining)
        if allocated <= 0:
            continue
        unit_cost = _effective_batch_unit_cost(batch)
        FinancingAllocation.objects.create(
            financing_item=financing_item,
            batch=batch,
            quantity=allocated,
            unit_cost=unit_cost,
        )
        batch.quantity_remaining = F("quantity_remaining") - allocated
        batch.save(update_fields=["quantity_remaining", "updated_at"])
        cost_total += allocated * unit_cost
        remaining -= allocated
        if remaining == 0:
            break
    if remaining > 0:
        raise ValidationError(
            {"items": [f"Insufficient available stock for {product.name}."]}
        )
    return cost_total


def _allocate_tracked(*, financing_item, product, tracked_unit_id):
    unit = (
        TrackedUnit.objects.select_for_update()
        .select_related("stock_line")
        .filter(
            id=tracked_unit_id,
            product=product,
            status=TrackedUnit.Status.AVAILABLE,
            stock_line__quantity_remaining__gt=0,
        )
        .first()
    )
    if unit is None:
        raise ValidationError(
            {"items": [f"The selected {product.name} item is no longer available."]}
        )
    batch = StockBatch.objects.select_for_update().get(pk=unit.stock_line_id)
    unit_cost = _effective_batch_unit_cost(batch)
    FinancingAllocation.objects.create(
        financing_item=financing_item,
        batch=batch,
        quantity=Decimal("1"),
        unit_cost=unit_cost,
    )
    batch.quantity_remaining = F("quantity_remaining") - 1
    batch.save(update_fields=["quantity_remaining", "updated_at"])
    # First financing slice reuses SOLD as the existing unavailable tracked-unit state.
    # A dedicated financed/reserved state can be introduced with the correction/release flow.
    unit.status = TrackedUnit.Status.SOLD
    unit.save(update_fields=["status", "updated_at"])
    return unit_cost


def _record_items(*, agreement, items):
    for item in items:
        quantity = item["quantity"]
        line_total = quantity * item["unit_price"]
        if agreement.source == FinancingAgreement.Source.INDEPENDENT:
            acquisition = item.get("acquisition_unit_cost")
            item_cost = quantity * acquisition if acquisition is not None else Decimal("0")
            FinancingItem.objects.create(
                agreement=agreement,
                item_name=item["item_name"].strip(),
                item_details=item.get("item_details", {}),
                quantity=quantity,
                unit_price=item["unit_price"],
                line_total=line_total,
                acquisition_unit_cost=acquisition,
                cost_total=item_cost,
                warranty_months=item.get("warranty_months"),
            )
            continue

        product = (
            Product.objects.select_for_update()
            .filter(id=item["product_id"], business=agreement.business, is_active=True)
            .first()
        )
        if product is None:
            raise ValidationError({"items": ["A selected Stock product is unavailable."]})
        tracked_unit_id = item.get("tracked_unit_id")
        quantity_to_reserve = Decimal("1") if tracked_unit_id else quantity
        financing_item = FinancingItem.objects.create(
            agreement=agreement,
            product=product,
            tracked_unit_id=tracked_unit_id,
            item_name=product.name,
            quantity=quantity_to_reserve,
            unit_price=item["unit_price"],
            line_total=quantity_to_reserve * item["unit_price"],
            warranty_months=item.get("warranty_months"),
        )
        if tracked_unit_id:
            item_cost = _allocate_tracked(
                financing_item=financing_item,
                product=product,
                tracked_unit_id=tracked_unit_id,
            )
        else:
            item_cost = _allocate_fifo(
                financing_item=financing_item,
                product=product,
                quantity=quantity,
            )
        financing_item.cost_total = item_cost
        financing_item.save(update_fields=["cost_total", "updated_at"])
        product.current_quantity = F("current_quantity") - quantity_to_reserve
        product.save(update_fields=["current_quantity", "updated_at"])


@transaction.atomic
def create_financing_agreement(*, actor, business_id, items, **values):
    membership = commerce_membership(
        user=actor,
        business_id=business_id,
        permission=WorkspacePermission.RECORD_FINANCING,
    )
    membership.business.__class__.objects.select_for_update().get(
        pk=membership.business_id
    )
    sequence = (
        FinancingAgreement.objects.select_for_update()
        .filter(business=membership.business)
        .aggregate(value=Max("sequence"))["value"]
        or 0
    ) + 1
    handle = "".join(
        character
        for character in membership.business.public_handle.upper()
        if character.isalnum()
    )[:8] or "TEED"
    agreement = FinancingAgreement.objects.create(
        business=membership.business,
        reference=f"{handle}-LN-{sequence:06d}",
        sequence=sequence,
        recorded_by=actor,
        **values,
    )
    _record_items(agreement=agreement, items=items)
    if agreement.agreement_type == FinancingAgreement.AgreementType.LOAN:
        agreement.product_released_at = timezone.now()
        agreement.save(update_fields=["product_released_at", "updated_at"])
    return agreement


def _add_month(value):
    month = value.month + 1
    year = value.year
    if month == 13:
        month = 1
        year += 1
    return value.replace(
        year=year,
        month=month,
        day=min(value.day, calendar.monthrange(year, month)[1]),
    )


def _next_due_date(agreement):
    if agreement.next_due_date is None:
        return None
    if agreement.frequency == FinancingAgreement.Frequency.WEEKLY:
        return agreement.next_due_date + timedelta(days=7)
    return _add_month(agreement.next_due_date)


@transaction.atomic
def record_financing_payment(*, actor, business_id, agreement_id, **values):
    membership = commerce_membership(
        user=actor,
        business_id=business_id,
        permission=WorkspacePermission.RECORD_FINANCING_PAYMENT,
    )
    agreement = (
        FinancingAgreement.objects.select_for_update()
        .prefetch_related("payments")
        .filter(id=agreement_id, business=membership.business)
        .first()
    )
    if agreement is None:
        raise ValidationError({"agreement_id": ["Financing agreement not found."]})
    if agreement.status in {FinancingAgreement.Status.CANCELLED, FinancingAgreement.Status.PAID}:
        raise ValidationError({"agreement_id": ["This financing agreement is not open for payments."]})
    payment = FinancingPayment.objects.create(
        agreement=agreement, recorded_by=actor, **values
    )
    agreement = FinancingAgreement.objects.prefetch_related("payments").get(pk=agreement.pk)
    if agreement.outstanding_balance <= 0:
        agreement.status = FinancingAgreement.Status.PAID
        agreement.next_due_date = None
    elif payment.amount >= agreement.installment_amount:
        agreement.status = FinancingAgreement.Status.ACTIVE
        agreement.next_due_date = _next_due_date(agreement)
    agreement.save(update_fields=["status", "next_due_date", "updated_at"])
    return payment


def sync_financing_due_notifications(*, actor, business_id):
    membership = commerce_membership(
        user=actor,
        business_id=business_id,
        permission=WorkspacePermission.VIEW_FINANCING,
    )
    today = timezone.localdate()
    agreements = FinancingAgreement.objects.filter(
        business=membership.business,
        status__in=[
            FinancingAgreement.Status.ACTIVE,
            FinancingAgreement.Status.DUE,
            FinancingAgreement.Status.OVERDUE,
        ],
        next_due_date__isnull=False,
    ).prefetch_related("payments")
    for agreement in agreements:
        if agreement.outstanding_balance <= 0:
            continue
        new_status = agreement.status
        if agreement.next_due_date < today:
            new_status = FinancingAgreement.Status.OVERDUE
        elif agreement.next_due_date == today:
            new_status = FinancingAgreement.Status.DUE
        if new_status != agreement.status:
            agreement.status = new_status
            agreement.save(update_fields=["status", "updated_at"])
        if new_status not in {FinancingAgreement.Status.DUE, FinancingAgreement.Status.OVERDUE}:
            continue
        notify_user(
            user=agreement.recorded_by,
            category=UserNotification.Category.WORKSPACE,
            template=UserNotification.Template.COMMERCE_FINANCING_DUE,
            context={
                "customer_name": agreement.customer_name,
                "agreement_reference": agreement.reference,
                "due_date": agreement.next_due_date.isoformat(),
                "amount": str(agreement.installment_amount),
                "status": new_status,
            },
            action_path=f"/workspace/{business_id}/commerce/financing",
            scope=UserNotification.Scope.WORKSPACE,
            business_id=business_id,
            deduplication_key=(
                f"financing:{agreement.id}:{agreement.next_due_date}:{new_status}"
            ),
        )


def require_financing_document_access(*, user, business_id, agreement_id):
    membership = commerce_membership(user=user, business_id=business_id)
    if not role_has_permission(
        membership.role, WorkspacePermission.MANAGE_FINANCING_DOCUMENTS
    ):
        raise PermissionDenied("You do not have permission to access financing documents.")
    agreement = FinancingAgreement.objects.filter(
        id=agreement_id, business=membership.business
    ).first()
    if agreement is None:
        raise ValidationError({"agreement_id": ["Financing agreement not found."]})
    return agreement


def attach_financing_document(*, actor, business_id, agreement_id, file, description=""):
    agreement = require_financing_document_access(
        user=actor, business_id=business_id, agreement_id=agreement_id
    )
    return FinancingDocument.objects.create(
        agreement=agreement,
        file=file,
        original_name=file.name,
        description=description,
        uploaded_by=actor,
    )
