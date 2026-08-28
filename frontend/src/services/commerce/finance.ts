import {
  budgetResponseSchema,
  budgetsWorkspaceResponseSchema,
  expenseResponseSchema,
  expensesWorkspaceResponseSchema,
} from "@/schemas/commerce/finance";
import { commerceBase } from "@/services/commerce/shared";
import { requestApi } from "@/services/global/api-client";
import { withCsrfRetry } from "@/services/identity/csrf";
import type {
  BudgetCreateInput,
  ExpenseCategory,
  ExpenseCreateInput,
} from "@/types/commerce/finance";

type ExpenseFilters = {
  month?: string;
  category?: ExpenseCategory;
};

function getExpenses(
  businessId: string,
  accessToken: string,
  filters: ExpenseFilters = {},
  signal?: AbortSignal,
) {
  const query = new URLSearchParams();
  if (filters.month) query.set("month", filters.month);
  if (filters.category) query.set("category", filters.category);
  const suffix = query.toString() ? `?${query.toString()}` : "";
  return requestApi({
    accessToken,
    path: `${commerceBase(businessId)}/expenses/${suffix}`,
    schema: expensesWorkspaceResponseSchema,
    signal,
  });
}

function createExpense(
  businessId: string,
  accessToken: string,
  body: ExpenseCreateInput,
) {
  return withCsrfRetry((csrfToken) =>
    requestApi({
      accessToken,
      body,
      csrfToken,
      method: "POST",
      path: `${commerceBase(businessId)}/expenses/`,
      schema: expenseResponseSchema,
    }),
  );
}

function updateExpense(
  businessId: string,
  expenseId: string,
  accessToken: string,
  body: ExpenseCreateInput,
) {
  return withCsrfRetry((csrfToken) =>
    requestApi({
      accessToken,
      body,
      csrfToken,
      method: "PATCH",
      path: `${commerceBase(businessId)}/expenses/${expenseId}/`,
      schema: expenseResponseSchema,
    }),
  );
}

function getBudgets(
  businessId: string,
  accessToken: string,
  signal?: AbortSignal,
) {
  return requestApi({
    accessToken,
    path: `${commerceBase(businessId)}/budgets/`,
    schema: budgetsWorkspaceResponseSchema,
    signal,
  });
}

function saveBudget(
  businessId: string,
  accessToken: string,
  body: BudgetCreateInput,
) {
  return withCsrfRetry((csrfToken) =>
    requestApi({
      accessToken,
      body,
      csrfToken,
      method: "POST",
      path: `${commerceBase(businessId)}/budgets/`,
      schema: budgetResponseSchema,
    }),
  );
}

export { createExpense, getBudgets, getExpenses, saveBudget, updateExpense };
export type { ExpenseFilters };
