from datetime import date, timedelta

from apps.commerce.finance.selectors import (
    current_budget_health,
    operating_expense_summary,
)
from apps.commerce.inventory.selectors import inventory_health
from apps.commerce.sales.selectors import sales_summary
from apps.workspaces.policy import WorkspacePermission, role_has_permission

from ..exceptions import InvalidToolArgumentsError
from .registry import AgentTool, ToolRegistry


def _parse_date(value, *, field_name):
    try:
        return date.fromisoformat(value)
    except (TypeError, ValueError) as exc:
        raise InvalidToolArgumentsError(
            f"{field_name} must use YYYY-MM-DD."
        ) from exc


def _parse_period(*, start_date, end_date):
    start = _parse_date(start_date, field_name="start_date")
    end = _parse_date(end_date, field_name="end_date")
    if end < start:
        raise InvalidToolArgumentsError("end_date cannot be before start_date.")
    if end - start > timedelta(days=366):
        raise InvalidToolArgumentsError("Date ranges cannot exceed 366 days.")
    return start, end


def _sales_payload(summary, *, can_manage_finance):
    payload = dict(summary)
    if not can_manage_finance:
        payload.pop("cost_of_goods", None)
        payload.pop("gross_profit", None)
    payload["finance_detail_available"] = can_manage_finance
    return payload


def build_commerce_tool_registry(*, membership, context):
    business = membership.business
    can_manage_finance = role_has_permission(
        membership.role,
        WorkspacePermission.MANAGE_FINANCE,
    )

    def business_pulse():
        sales = sales_summary(
            business=business,
            start_date=context.local_date,
            end_date=context.local_date,
        )
        payload = {
            "business": {
                "name": context.business_name,
                "local_date": context.local_date.isoformat(),
                "timezone": context.timezone_name,
            },
            "sales": _sales_payload(
                sales,
                can_manage_finance=can_manage_finance,
            ),
            "inventory": inventory_health(business=business),
        }
        if can_manage_finance:
            payload["finance"] = {
                "operating_expenses": operating_expense_summary(
                    business=business,
                    start_date=context.local_date,
                    end_date=context.local_date,
                ),
                "budgets": current_budget_health(
                    business=business,
                    as_of_date=context.local_date,
                ),
            }
        return payload

    def sales_period_summary(*, start_date, end_date):
        start, end = _parse_period(start_date=start_date, end_date=end_date)
        summary = sales_summary(
            business=business,
            start_date=start,
            end_date=end,
        )
        return _sales_payload(
            summary,
            can_manage_finance=can_manage_finance,
        )

    def current_inventory_health():
        return inventory_health(business=business)

    def expense_period_summary(*, start_date, end_date):
        start, end = _parse_period(start_date=start_date, end_date=end_date)
        return operating_expense_summary(
            business=business,
            start_date=start,
            end_date=end,
        )

    def budget_status(*, as_of_date=None):
        selected_date = (
            _parse_date(as_of_date, field_name="as_of_date")
            if as_of_date
            else context.local_date
        )
        return current_budget_health(
            business=business,
            as_of_date=selected_date,
        )

    tools = [
        AgentTool(
            name="commerce_business_pulse",
            description=(
                "Return today's verified sales and inventory pulse for the current "
                "authorized Tunakuza workspace. Finance details are included only when "
                "the current role is allowed to manage finance."
            ),
            input_schema={
                "type": "object",
                "properties": {},
                "additionalProperties": False,
            },
            handler=business_pulse,
        ),
        AgentTool(
            name="commerce_sales_summary",
            description=(
                "Return verified sales performance for an inclusive date range in "
                "the current authorized workspace. Call it more than once when "
                "comparing periods."
            ),
            input_schema={
                "type": "object",
                "properties": {
                    "start_date": {
                        "type": "string",
                        "format": "date",
                        "description": "Inclusive start date in YYYY-MM-DD format.",
                    },
                    "end_date": {
                        "type": "string",
                        "format": "date",
                        "description": "Inclusive end date in YYYY-MM-DD format.",
                    },
                },
                "required": ["start_date", "end_date"],
                "additionalProperties": False,
            },
            handler=sales_period_summary,
        ),
        AgentTool(
            name="commerce_inventory_health",
            description=(
                "Return verified current inventory counts plus low-stock and sold-out "
                "items for the current authorized workspace."
            ),
            input_schema={
                "type": "object",
                "properties": {},
                "additionalProperties": False,
            },
            handler=current_inventory_health,
        ),
    ]

    if can_manage_finance:
        tools.extend(
            [
                AgentTool(
                    name="commerce_expense_summary",
                    description=(
                        "Return verified operating expenses, excluding stock acquisition "
                        "costs, for an inclusive date range in the current authorized "
                        "workspace."
                    ),
                    input_schema={
                        "type": "object",
                        "properties": {
                            "start_date": {
                                "type": "string",
                                "format": "date",
                                "description": (
                                    "Inclusive start date in YYYY-MM-DD format."
                                ),
                            },
                            "end_date": {
                                "type": "string",
                                "format": "date",
                                "description": "Inclusive end date in YYYY-MM-DD format.",
                            },
                        },
                        "required": ["start_date", "end_date"],
                        "additionalProperties": False,
                    },
                    handler=expense_period_summary,
                ),
                AgentTool(
                    name="commerce_budget_status",
                    description=(
                        "Return verified daily, weekly, and monthly budget status for the "
                        "current authorized workspace on a selected date. Monthly budget "
                        "actuals include operating expenses and stock purchase spend."
                    ),
                    input_schema={
                        "type": "object",
                        "properties": {
                            "as_of_date": {
                                "type": "string",
                                "format": "date",
                                "description": (
                                    "Date in YYYY-MM-DD format. Omit to use the workspace "
                                    "local date."
                                ),
                            }
                        },
                        "additionalProperties": False,
                    },
                    handler=budget_status,
                ),
            ]
        )

    return ToolRegistry(tools)
