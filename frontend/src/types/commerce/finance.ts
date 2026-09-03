type ExpenseCategory =
  | "salaries_wages"
  | "rent"
  | "utilities"
  | "internet_phone"
  | "transport_travel"
  | "marketing_advertising"
  | "repairs_maintenance"
  | "software_subscriptions"
  | "professional_services"
  | "bank_payment_fees"
  | "insurance"
  | "licenses_permits"
  | "office_admin"
  | "security_cleaning"
  | "taxes_duties"
  | "interest_finance"
  | "meals_hospitality"
  | "other";

type ExpensePaymentMethod =
  | "cash"
  | "bank_transfer"
  | "mobile_money"
  | "card"
  | "cheque"
  | "other";

type ExpenseRecord = {
  id: string;
  expense_number: string;
  category: string;
  category_label: string;
  description: string;
  amount: string;
  payee: string;
  payment_method: ExpensePaymentMethod;
  payment_method_label: string;
  reference: string;
  notes: string;
  incurred_at: string;
  recorded_by_email: string;
  created_at: string;
};

type ExpenseCategoryTotal = {
  category: string;
  total: string;
};

type ExpenseSummary = {
  total: string;
  category_totals: ExpenseCategoryTotal[];
};

type ExpenseCreateInput = {
  category: ExpenseCategory;
  description: string;
  amount: string;
  payee: string;
  payment_method: ExpensePaymentMethod;
  reference: string;
  notes: string;
  incurred_at: string;
};

type BudgetPeriodType = "daily" | "weekly" | "monthly";
type BudgetStatus = "on_track" | "approaching_limit" | "over_budget";

type BudgetRecord = {
  id: string;
  period_type: BudgetPeriodType;
  period_type_label: string;
  period_start: string;
  planned_amount: string;
  notes: string;
  operating_expenses: string;
  stock_purchases: string;
  actual_amount: string;
  remaining_amount: string;
  utilization_percent: string;
  status: BudgetStatus;
  created_at: string;
  updated_at: string;
};

type BudgetCreateInput = {
  period_type: BudgetPeriodType;
  period_start: string;
  planned_amount: string;
  notes: string;
};

export type {
  BudgetCreateInput,
  BudgetPeriodType,
  BudgetRecord,
  BudgetStatus,
  ExpenseCategory,
  ExpenseCreateInput,
  ExpensePaymentMethod,
  ExpenseRecord,
  ExpenseSummary,
};
