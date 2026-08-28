import { z } from "zod";

import { createApiEnvelopeSchema } from "@/schemas/global/api";

const expenseCategorySchema = z.enum([
  "salaries_wages",
  "rent",
  "utilities",
  "internet_phone",
  "transport_travel",
  "marketing_advertising",
  "repairs_maintenance",
  "software_subscriptions",
  "professional_services",
  "bank_payment_fees",
  "insurance",
  "licenses_permits",
  "office_admin",
  "security_cleaning",
  "taxes_duties",
  "interest_finance",
  "meals_hospitality",
  "other",
]);

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
  category: expenseCategorySchema,
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
          category: expenseCategorySchema,
          total: z.string(),
        }),
      ),
    }),
  }),
);

const expenseResponseSchema = createApiEnvelopeSchema(expenseRecordSchema);

const budgetRecordSchema = z.object({
  id: z.string().uuid(),
  category: expenseCategorySchema,
  category_label: z.string(),
  month: z.string(),
  planned_amount: z.string(),
  notes: z.string(),
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

const budgetResponseSchema = createApiEnvelopeSchema(
  budgetRecordSchema.omit({
    actual_amount: true,
    remaining_amount: true,
    utilization_percent: true,
    status: true,
  }),
);

export {
  budgetResponseSchema,
  budgetsWorkspaceResponseSchema,
  expenseResponseSchema,
  expensesWorkspaceResponseSchema,
};
