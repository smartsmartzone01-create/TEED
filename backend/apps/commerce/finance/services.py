from django.db import transaction
from rest_framework.exceptions import ValidationError

from apps.workspaces.policy import WorkspacePermission

from ..services import commerce_membership
from .models import Budget, Expense
from .selectors import normalize_budget_period_start


@transaction.atomic
def create_expense(*, actor, business_id, **values):
    membership = commerce_membership(
        user=actor,
        business_id=business_id,
        permission=WorkspacePermission.MANAGE_FINANCE,
    )
    membership.business.__class__.objects.select_for_update().get(
        pk=membership.business_id
    )

    next_number = (
        Expense.objects.filter(
            business=membership.business,
            stock_receipt__isnull=True,
        ).count()
        + 1
    )
    expense_number = f"EXP-{next_number:06d}"
    while Expense.objects.filter(
        business=membership.business,
        expense_number=expense_number,
    ).exists():
        next_number += 1
        expense_number = f"EXP-{next_number:06d}"

    return Expense.objects.create(
        business=membership.business,
        recorded_by=actor,
        expense_number=expense_number,
        **values,
    )


@transaction.atomic
def update_expense(*, actor, business_id, expense_id, **values):
    membership = commerce_membership(
        user=actor,
        business_id=business_id,
        permission=WorkspacePermission.MANAGE_FINANCE,
    )
    expense = (
        Expense.objects.select_for_update()
        .filter(
            id=expense_id,
            business=membership.business,
            stock_receipt__isnull=True,
        )
        .first()
    )
    if expense is None:
        raise ValidationError({"expense": ["Expense not found or cannot be edited."]})

    for field, value in values.items():
        setattr(expense, field, value)
    expense.save(update_fields=[*values.keys(), "updated_at"])
    return expense


@transaction.atomic
def set_budget(
    *,
    actor,
    business_id,
    period_type,
    period_start,
    planned_amount,
    notes="",
):
    membership = commerce_membership(
        user=actor,
        business_id=business_id,
        permission=WorkspacePermission.MANAGE_FINANCE,
    )
    membership.business.__class__.objects.select_for_update().get(
        pk=membership.business_id
    )

    normalized_start = normalize_budget_period_start(
        period_type=period_type,
        period_start=period_start,
    )
    budget, _ = Budget.objects.update_or_create(
        business=membership.business,
        period_type=period_type,
        period_start=normalized_start,
        defaults={
            "planned_amount": planned_amount,
            "notes": notes,
            "category": "",
            "month": None,
        },
    )
    return budget
