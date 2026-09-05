from decimal import Decimal

from django.db.models import DecimalField, Q, Sum, Value
from django.db.models.functions import Coalesce

from .models import FinancingAgreement


_MONEY_FIELD = DecimalField(max_digits=14, decimal_places=2)
_PERCENT_QUANTUM = Decimal("0.01")
_OPEN_STATUSES = {
    FinancingAgreement.Status.ACTIVE,
    FinancingAgreement.Status.DUE,
    FinancingAgreement.Status.OVERDUE,
}


def _effective_status(*, agreement, outstanding_balance, as_of_date):
    persisted_status = agreement["status"]
    if persisted_status == FinancingAgreement.Status.CANCELLED:
        return FinancingAgreement.Status.CANCELLED
    if persisted_status == FinancingAgreement.Status.PAID or outstanding_balance <= 0:
        return FinancingAgreement.Status.PAID

    next_due_date = agreement["next_due_date"]
    if next_due_date is not None:
        if next_due_date < as_of_date:
            return FinancingAgreement.Status.OVERDUE
        if next_due_date == as_of_date:
            return FinancingAgreement.Status.DUE
    return FinancingAgreement.Status.ACTIVE


def _agreement_outstanding(
    *, contract_total, upfront_cash, trade_in_credit, payments_total
):
    return max(
        Decimal("0.00"),
        contract_total - upfront_cash - trade_in_credit - payments_total,
    )


def _agreement_item_payload(item):
    identifiers = []
    if item.tracked_unit_id:
        unit = item.tracked_unit
        identifiers = [
            {"kind": identifier.kind, "value": identifier.value}
            for identifier in unit.identifiers.all()
        ]
        if unit.imei and not any(
            identifier["kind"] == "imei" for identifier in identifiers
        ):
            identifiers.append({"kind": "imei", "value": unit.imei})
        if unit.serial_number and not any(
            identifier["kind"] == "serial" for identifier in identifiers
        ):
            identifiers.append({"kind": "serial", "value": unit.serial_number})

    return {
        "item_id": str(item.id),
        "product_id": str(item.product_id) if item.product_id else None,
        "product_name": item.product.name if item.product_id else item.item_name,
        "product_sku": item.product.sku if item.product_id else "",
        "item_name": item.item_name,
        "item_details": item.item_details or {},
        "quantity": item.quantity,
        "unit_price": item.unit_price,
        "line_total": item.line_total,
        "warranty_months": item.warranty_months,
        "tracked_unit": (
            {
                "unit_id": str(item.tracked_unit_id),
                "internal_serial": item.tracked_unit.internal_serial,
                "model_name": item.tracked_unit.model_name,
                "brand": item.tracked_unit.brand,
                "color": item.tracked_unit.color,
                "capacity": item.tracked_unit.capacity,
                "identifiers": identifiers,
            }
            if item.tracked_unit_id
            else None
        ),
    }


def financing_portfolio_summary(*, business, as_of_date):
    agreements = list(
        FinancingAgreement.objects.filter(business=business)
        .annotate(
            payments_total=Coalesce(
                Sum("payments__amount"),
                Value(Decimal("0.00"), output_field=_MONEY_FIELD),
                output_field=_MONEY_FIELD,
            )
        )
        .values(
            "agreement_type",
            "financing_mode",
            "status",
            "contract_total",
            "upfront_cash",
            "trade_in_credit",
            "installment_amount",
            "next_due_date",
            "product_released_at",
            "payments_total",
        )
    )

    status_counts = {status.value: 0 for status in FinancingAgreement.Status}
    agreement_type_counts = {
        agreement_type.value: 0 for agreement_type in FinancingAgreement.AgreementType
    }
    financing_mode_counts = {
        mode.value: 0 for mode in FinancingAgreement.FinancingMode
    }
    outstanding_by_type = {
        agreement_type.value: Decimal("0.00")
        for agreement_type in FinancingAgreement.AgreementType
    }

    open_agreement_count = 0
    open_contract_total = Decimal("0.00")
    open_contribution_total = Decimal("0.00")
    open_payments_total = Decimal("0.00")
    open_outstanding_balance = Decimal("0.00")
    due_today_count = 0
    due_today_amount = Decimal("0.00")
    overdue_count = 0
    overdue_outstanding_balance = Decimal("0.00")
    installments_awaiting_release_count = 0
    next_upcoming_due_date = None
    oldest_overdue_date = None

    for agreement in agreements:
        agreement_type = agreement["agreement_type"]
        financing_mode = agreement["financing_mode"]
        agreement_type_counts[agreement_type] += 1
        financing_mode_counts[financing_mode] += 1

        contribution_total = agreement["upfront_cash"] + agreement["trade_in_credit"]
        payments_total = agreement["payments_total"] or Decimal("0.00")
        outstanding_balance = _agreement_outstanding(
            contract_total=agreement["contract_total"],
            upfront_cash=agreement["upfront_cash"],
            trade_in_credit=agreement["trade_in_credit"],
            payments_total=payments_total,
        )
        effective_status = _effective_status(
            agreement=agreement,
            outstanding_balance=outstanding_balance,
            as_of_date=as_of_date,
        )
        status_counts[effective_status] += 1

        if effective_status not in _OPEN_STATUSES:
            continue

        open_agreement_count += 1
        open_contract_total += agreement["contract_total"]
        open_contribution_total += contribution_total
        open_payments_total += payments_total
        open_outstanding_balance += outstanding_balance
        outstanding_by_type[agreement_type] += outstanding_balance

        agreement_due_date = agreement["next_due_date"]
        if agreement_due_date is not None:
            if agreement_due_date >= as_of_date and (
                next_upcoming_due_date is None
                or agreement_due_date < next_upcoming_due_date
            ):
                next_upcoming_due_date = agreement_due_date
            if agreement_due_date < as_of_date and (
                oldest_overdue_date is None or agreement_due_date < oldest_overdue_date
            ):
                oldest_overdue_date = agreement_due_date

        if effective_status == FinancingAgreement.Status.DUE:
            due_today_count += 1
            due_today_amount += min(
                agreement["installment_amount"],
                outstanding_balance,
            )
        elif effective_status == FinancingAgreement.Status.OVERDUE:
            overdue_count += 1
            overdue_outstanding_balance += outstanding_balance

        if (
            agreement_type == FinancingAgreement.AgreementType.INSTALLMENT
            and agreement["product_released_at"] is None
        ):
            installments_awaiting_release_count += 1

    overdue_outstanding_percent = (
        (
            overdue_outstanding_balance
            * Decimal("100")
            / open_outstanding_balance
        ).quantize(_PERCENT_QUANTUM)
        if open_outstanding_balance > 0
        else Decimal("0.00")
    )

    return {
        "as_of_date": as_of_date.isoformat(),
        "agreement_count": len(agreements),
        "status_counts": status_counts,
        "agreement_type_counts": agreement_type_counts,
        "financing_mode_counts": financing_mode_counts,
        "open_portfolio": {
            "agreement_count": open_agreement_count,
            "contract_total": open_contract_total,
            "contribution_total": open_contribution_total,
            "payments_total": open_payments_total,
            "outstanding_balance": open_outstanding_balance,
            "outstanding_by_type": outstanding_by_type,
            "due_today_count": due_today_count,
            "due_today_amount": due_today_amount,
            "overdue_count": overdue_count,
            "overdue_outstanding_balance": overdue_outstanding_balance,
            "overdue_outstanding_percent": overdue_outstanding_percent,
            "installments_awaiting_release_count": installments_awaiting_release_count,
            "next_upcoming_due_date": (
                next_upcoming_due_date.isoformat() if next_upcoming_due_date else None
            ),
            "oldest_overdue_date": (
                oldest_overdue_date.isoformat() if oldest_overdue_date else None
            ),
        },
    }


def financing_agreement_search(
    *, business, as_of_date, query="", limit=8, sort="newest"
):
    """Search financing agreements by reference, customer, product, or tracked identifier."""
    cleaned = str(query or "").strip()
    queryset = FinancingAgreement.objects.filter(business=business)
    if cleaned:
        queryset = queryset.filter(
            Q(reference__icontains=cleaned)
            | Q(customer_name__icontains=cleaned)
            | Q(customer_phone__icontains=cleaned)
            | Q(items__item_name__icontains=cleaned)
            | Q(items__product__name__icontains=cleaned)
            | Q(items__product__sku__icontains=cleaned)
            | Q(items__tracked_unit__internal_serial__icontains=cleaned)
            | Q(items__tracked_unit__imei__icontains=cleaned)
            | Q(items__tracked_unit__serial_number__icontains=cleaned)
            | Q(items__tracked_unit__identifiers__value__icontains=cleaned)
            | Q(items__tracked_unit__model_name__icontains=cleaned)
            | Q(items__tracked_unit__brand__icontains=cleaned)
        )
    order = "created_at" if sort == "oldest" else "-created_at"
    agreements = (
        queryset.prefetch_related("items__product", "payments")
        .distinct()
        .order_by(order)[:limit]
    )

    results = []
    for agreement in agreements:
        payments_total = sum(
            (payment.amount for payment in agreement.payments.all()),
            Decimal("0.00"),
        )
        outstanding_balance = _agreement_outstanding(
            contract_total=agreement.contract_total,
            upfront_cash=agreement.upfront_cash,
            trade_in_credit=agreement.trade_in_credit,
            payments_total=payments_total,
        )
        effective_status = _effective_status(
            agreement={
                "status": agreement.status,
                "next_due_date": agreement.next_due_date,
            },
            outstanding_balance=outstanding_balance,
            as_of_date=as_of_date,
        )
        results.append(
            {
                "agreement_id": str(agreement.id),
                "reference": agreement.reference,
                "agreement_type": agreement.agreement_type,
                "status": agreement.status,
                "effective_status": effective_status,
                "customer_name": agreement.customer_name,
                "contract_total": agreement.contract_total,
                "payments_total": payments_total,
                "outstanding_balance": outstanding_balance,
                "next_due_date": (
                    agreement.next_due_date.isoformat()
                    if agreement.next_due_date
                    else None
                ),
                "items": [
                    {
                        "product_name": (
                            item.product.name if item.product_id else item.item_name
                        ),
                        "product_sku": item.product.sku if item.product_id else "",
                        "quantity": item.quantity,
                    }
                    for item in agreement.items.all()
                ],
                "created_at": agreement.created_at.isoformat(),
            }
        )

    return {
        "query": cleaned,
        "sort": sort,
        "results": results,
    }


def financing_agreement_detail(*, business, as_of_date, reference):
    """Return one agreement's operational/customer detail without internal costs or docs."""
    cleaned = str(reference or "").strip()
    agreement = (
        FinancingAgreement.objects.filter(business=business, reference__iexact=cleaned)
        .prefetch_related(
            "items__product",
            "items__tracked_unit__identifiers",
            "payments",
        )
        .first()
    )
    if agreement is None:
        return {"reference": cleaned, "found": False}

    payments = list(agreement.payments.all())
    payments_total = sum((payment.amount for payment in payments), Decimal("0.00"))
    outstanding_balance = _agreement_outstanding(
        contract_total=agreement.contract_total,
        upfront_cash=agreement.upfront_cash,
        trade_in_credit=agreement.trade_in_credit,
        payments_total=payments_total,
    )
    effective_status = _effective_status(
        agreement={
            "status": agreement.status,
            "next_due_date": agreement.next_due_date,
        },
        outstanding_balance=outstanding_balance,
        as_of_date=as_of_date,
    )

    return {
        "found": True,
        "agreement_id": str(agreement.id),
        "reference": agreement.reference,
        "agreement_type": agreement.agreement_type,
        "transaction_type": agreement.transaction_type,
        "source": agreement.source,
        "market_type": agreement.market_type,
        "financing_mode": agreement.financing_mode,
        "status": agreement.status,
        "effective_status": effective_status,
        "customer": {
            "name": agreement.customer_name,
            "phone": agreement.customer_phone,
            "region": agreement.customer_region,
        },
        "contract_total": agreement.contract_total,
        "upfront_cash": agreement.upfront_cash,
        "trade_in_credit": agreement.trade_in_credit,
        "contribution_total": agreement.upfront_cash + agreement.trade_in_credit,
        "installment_amount": agreement.installment_amount,
        "frequency": agreement.frequency,
        "payments_total": payments_total,
        "outstanding_balance": outstanding_balance,
        "next_due_date": (
            agreement.next_due_date.isoformat() if agreement.next_due_date else None
        ),
        "release_threshold_percent": agreement.release_threshold_percent,
        "product_released_at": (
            agreement.product_released_at.isoformat()
            if agreement.product_released_at
            else None
        ),
        "items": [_agreement_item_payload(item) for item in agreement.items.all()],
        "payments": [
            {
                "payment_id": str(payment.id),
                "amount": payment.amount,
                "paid_at": payment.paid_at.isoformat(),
                "method": payment.method,
                "reference": payment.reference,
            }
            for payment in payments
        ],
        "created_at": agreement.created_at.isoformat(),
    }
