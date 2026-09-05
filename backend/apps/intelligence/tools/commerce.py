from datetime import date, timedelta

from apps.commerce.finance.selectors import (
    current_budget_health,
    operating_expense_summary,
)
from apps.commerce.financing.selectors import (
    financing_agreement_detail,
    financing_agreement_search,
    financing_portfolio_summary,
)
from apps.commerce.inventory.selectors import (
    inventory_health,
    inventory_search,
    stock_receipt_detail,
)
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


def _bounded_limit(value, *, default=8, maximum=12):
    if value is None:
        return default
    try:
        parsed = int(value)
    except (TypeError, ValueError) as exc:
        raise InvalidToolArgumentsError("limit must be an integer.") from exc
    if parsed < 1 or parsed > maximum:
        raise InvalidToolArgumentsError(f"limit must be between 1 and {maximum}.")
    return parsed


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
    can_view_financing = role_has_permission(
        membership.role,
        WorkspacePermission.VIEW_FINANCING,
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

    def search_inventory(*, query, limit=None):
        return inventory_search(
            business=business,
            query=query,
            limit=_bounded_limit(limit),
        )

    def receipt_detail(*, reference):
        return stock_receipt_detail(
            business=business,
            reference=reference,
        )

    def current_financing_summary():
        return financing_portfolio_summary(
            business=business,
            as_of_date=context.local_date,
        )

    def search_financing(*, query="", limit=None, sort="newest"):
        if sort not in {"newest", "oldest"}:
            raise InvalidToolArgumentsError("sort must be newest or oldest.")
        return financing_agreement_search(
            business=business,
            as_of_date=context.local_date,
            query=query,
            limit=_bounded_limit(limit),
            sort=sort,
        )

    def agreement_detail(*, reference):
        return financing_agreement_detail(
            business=business,
            as_of_date=context.local_date,
            reference=reference,
        )

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
        AgentTool(
            name="commerce_inventory_search",
            description=(
                "Search verified Stock data in the current workspace by product name, "
                "SKU, barcode, stock receipt/reference, batch/group name or code, tracked "
                "unit serial, IMEI, or other tracked identifier. Use this before a detail "
                "tool when the user provides a product, stock reference, or device identifier."
            ),
            input_schema={
                "type": "object",
                "properties": {
                    "query": {
                        "type": "string",
                        "minLength": 1,
                        "description": "Product, SKU, stock reference, batch, serial, IMEI, or identifier to search.",
                    },
                    "limit": {
                        "type": "integer",
                        "minimum": 1,
                        "maximum": 12,
                        "description": "Maximum matches per result category. Defaults to 8.",
                    },
                },
                "required": ["query"],
                "additionalProperties": False,
            },
            handler=search_inventory,
        ),
        AgentTool(
            name="commerce_stock_receipt_detail",
            description=(
                "Return the verified product, batch, group, quantity, and tracking structure "
                "inside one exact Stock receipt/reference in the current workspace. This "
                "read-only tool excludes supplier details, notes, acquisition costs, and "
                "other internal finance fields."
            ),
            input_schema={
                "type": "object",
                "properties": {
                    "reference": {
                        "type": "string",
                        "minLength": 1,
                        "description": "Exact Stock receipt/reference, for example MZIGO-000015.",
                    }
                },
                "required": ["reference"],
                "additionalProperties": False,
            },
            handler=receipt_detail,
        ),
    ]

    if can_view_financing:
        tools.extend(
            [
                AgentTool(
                    name="commerce_financing_summary",
                    description=(
                        "Return the current verified loans and installment portfolio summary "
                        "for the authorized workspace, including open balances, due and "
                        "overdue exposure, overdue share of outstanding balance, agreement "
                        "mix, and installment product-release state. In this tool, open means "
                        "not paid or cancelled and may include active, due, or overdue "
                        "agreements; do not describe every open agreement as active. An "
                        "installment awaiting release means its product has not yet been "
                        "released to the customer; it does not mean the agreement is unfunded "
                        "or inactive. The summary excludes customer identity, documents, "
                        "notes, and internal acquisition-cost or profit details."
                    ),
                    input_schema={
                        "type": "object",
                        "properties": {},
                        "additionalProperties": False,
                    },
                    handler=current_financing_summary,
                ),
                AgentTool(
                    name="commerce_financing_search",
                    description=(
                        "Search financing agreements the current user is authorized to view by "
                        "agreement reference, customer, product/SKU, tracked unit serial, IMEI, "
                        "or other tracked identifier. An empty query is allowed when the user "
                        "asks for the newest or oldest agreements. Results are concise; use the "
                        "agreement detail tool for one selected reference."
                    ),
                    input_schema={
                        "type": "object",
                        "properties": {
                            "query": {
                                "type": "string",
                                "description": "Search text. Omit or pass an empty string for newest/oldest agreement requests.",
                            },
                            "sort": {
                                "type": "string",
                                "enum": ["newest", "oldest"],
                                "description": "Result ordering. Defaults to newest.",
                            },
                            "limit": {
                                "type": "integer",
                                "minimum": 1,
                                "maximum": 12,
                                "description": "Maximum matches. Defaults to 8.",
                            },
                        },
                        "additionalProperties": False,
                    },
                    handler=search_financing,
                ),
                AgentTool(
                    name="commerce_financing_agreement_detail",
                    description=(
                        "Return verified operational detail for one exact financing agreement "
                        "reference the current user is authorized to view, including customer "
                        "name/phone/region, financed items and tracked identifiers, payment "
                        "history, balances, due date, effective status, and product release "
                        "state. Customer contact is available here because the same existing "
                        "VIEW_FINANCING permission already exposes it in Tunakuza's financing "
                        "UI. Do not refuse authorized customer contact merely because it is "
                        "personal data. This tool excludes documents, notes, acquisition costs, "
                        "partner settlement internals, and profit calculations."
                    ),
                    input_schema={
                        "type": "object",
                        "properties": {
                            "reference": {
                                "type": "string",
                                "minLength": 1,
                                "description": "Exact financing agreement reference, for example SMARTSMA-LN-000009.",
                            }
                        },
                        "required": ["reference"],
                        "additionalProperties": False,
                    },
                    handler=agreement_detail,
                ),
            ]
        )

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
