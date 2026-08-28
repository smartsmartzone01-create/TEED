import { z } from "zod";

import { createApiEnvelopeSchema } from "@/schemas/global/api";

const expensePaymentMethodSchema = z.enum([
  "cash",
  "bank_transfer",
  "mobile_money",
  "card",
  "cheque",
  "other",
]);

const expenseRecordSchema = z.object({
  id: z.string().uuid(),
  expense_number: z.string(),
  category: z.string(),
  category_label: z.string(),
  description: z.string(),
  amount: z.string(),
  payee: z.string(),
  payment_method: expensePaymentMethodSchema,
  payment_method_label: z.string(),
  reference: z.string(),
  notes: z.string(),
  incurred_at: z.string(),
  recorded_by_email: z.string(),
  created_at: z.string(),
});

const expensesWorkspaceResponseSchema = createApiEnvelopeSchema(
  z.object({
    expenses: z.array(expenseRecordSchema),
    summary: z.object({
      total: z.string(),
      category_totals: z.array(
        z.object({
          category: z.string(),
          total: z.string(),
        }),
      ),
    }),
  }),
);

const expenseResponseSchema = createApiEnvelopeSchema(expenseRecordSchema);

const budgetRecordSchema = z.object({
  id: z.string().uuid(),
  period_type: z.enum(["daily", "weekly", "monthly"]),
  period_type_label: z.string(),
  period_start: z.string(),
  planned_amount: z.string(),
  notes: z.string(),
  operating_expenses: z.string(),
  stock_purchases: z.string(),
  actual_amount: z.string(),
  remaining_amount: z.string(),
  utilization_percent: z.string(),
  status: z.enum(["on_track", "approaching_limit", "over_budget"]),
  created_at: z.string(),
  updated_at: z.string(),
});

const budgetsWorkspaceResponseSchema = createApiEnvelopeSchema(
  z.object({ budgets: z.array(budgetRecordSchema) }),
);

const budgetResponseSchema = createApiEnvelopeSchema(budgetRecordSchema);

export {
  budgetResponseSchema,
  budgetsWorkspaceResponseSchema,
  expenseResponseSchema,
  expensesWorkspaceResponseSchema,
};
