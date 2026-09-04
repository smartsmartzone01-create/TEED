from decimal import Decimal

from django.db.models import DecimalField, Sum, Value
from django.db.models.functions import Coalesce

from .models import FinancingAgreement


_MONEY_FIELD = DecimalField(max_digits=14, decimal_places=2)
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
        outstanding_balance = max(
            Decimal("0.00"),
            agreement["contract_total"] - contribution_total - payments_total,
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
            "installments_awaiting_release_count": installments_awaiting_release_count,
            "next_upcoming_due_date": (
                next_upcoming_due_date.isoformat() if next_upcoming_due_date else None
            ),
            "oldest_overdue_date": (
                oldest_overdue_date.isoformat() if oldest_overdue_date else None
            ),
        },
    }
