# Commerce Operations module

Commerce Operations is a workspace-owned application for business workspaces. It does not
replace accounting software. It records the operational facts TEED needs to explain stock,
sales, returns, expenses, simple budgets, and practical operating results.

## Transaction flow

1. A product defines the reusable item, price, unit, and low-stock threshold.
2. Each stock receipt creates a costed batch and an immutable inventory movement.
3. A retail or wholesale sale allocates the oldest available batches first (FIFO).
4. A return remains linked to the original receipt. Sellable quantities return to their
   source batches; damaged quantities do not inflate available stock.
5. Expenses and monthly category budgets provide a deliberately simple finance layer.
6. Business Pulse derives current state and refreshes the Decision Inbox after operational
   changes.

## Access policy

The app uses fixed workspace roles. Owners and partners control every commerce operation.
Administrators can manage commerce and finance. Managers can manage catalog, inventory,
and sales. Members can view commerce and record sales. Cost, profit, expense, and stock-value
figures are withheld unless the role has the finance permission.

Commerce endpoints also require the `business_operations` workspace capability. Service and
personal-brand workspaces cannot use the module merely by guessing its URL.

## Business Pulse

Business Pulse is deterministic application logic, not AI. It summarizes current operational
facts and creates focused decisions such as low-stock and slow-moving-stock warnings. Every
decision includes an explanation and a direct workspace action path. AI can later interpret
this trusted state, but it is not required for the inbox to work.
