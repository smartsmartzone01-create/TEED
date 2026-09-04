from datetime import date, timedelta

from apps.commerce.inventory.selectors import inventory_health
from apps.commerce.sales.selectors import sales_summary
from apps.workspaces.policy import WorkspacePermission, role_has_permission

from ..exceptions import InvalidToolArgumentsError
from .registry import AgentTool, ToolRegistry


def _parse_period(*, start_date, end_date):
    try:
        start = date.fromisoformat(start_date)
        end = date.fromisoformat(end_date)
    except (TypeError, ValueError) as exc:
        raise InvalidToolArgumentsError(
            "Sales summary dates must use YYYY-MM-DD."
        ) from exc

    if end < start:
        raise InvalidToolArgumentsError(
            "Sales summary end_date cannot be before start_date."
        )
    if end - start > timedelta(days=366):
        raise InvalidToolArgumentsError(
            "Sales summary ranges cannot exceed 366 days."
        )
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
        return {
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

    return ToolRegistry(
        [
            AgentTool(
                name="commerce_business_pulse",
                description=(
                    "Return today's verified sales and inventory pulse for the current "
                    "authorized Tunakuza workspace. Use for broad questions about how "
                    "the business is doing today."
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
    )
