"use client";

import { CircleHelp, Pencil, ReceiptText, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useState, type FormEvent } from "react";

import { Button } from "@/components/global/primitives/button";
import { Input } from "@/components/global/primitives/input";
import { Select } from "@/components/global/primitives/select";
import { Tooltip, TooltipProvider } from "@/components/global/primitives/tooltip";
import { useNotification } from "@/providers/global/notification-provider";
import { useIdentitySession } from "@/providers/identity/identity-session-provider";
import {
  createExpense,
  getExpenses,
  updateExpense,
} from "@/services/commerce/finance";
import { isRequestCancelled } from "@/services/global/api-client";
import type {
  ExpenseCategory,
  ExpensePaymentMethod,
  ExpenseRecord,
  ExpenseSummary,
} from "@/types/commerce/finance";

const panel =
  "rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-950";
const field =
  "grid min-w-0 gap-1.5 text-xs font-semibold text-slate-600 dark:text-slate-300";
const categories: ExpenseCategory[] = [
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
];
const paymentMethods: ExpensePaymentMethod[] = [
  "cash",
  "bank_transfer",
  "mobile_money",
  "card",
  "cheque",
  "other",
];

const nowLocal = () => {
  const date = new Date();
  date.setMinutes(date.getMinutes() - date.getTimezoneOffset());
  return date.toISOString().slice(0, 16);
};

const monthLocal = () => nowLocal().slice(0, 7);

function localDateTimeInput(value: string) {
  const date = new Date(value);
  date.setMinutes(date.getMinutes() - date.getTimezoneOffset());
  return date.toISOString().slice(0, 16);
}

function money(value: string) {
  return new Intl.NumberFormat(undefined, { maximumFractionDigits: 2 }).format(
    Number(value),
  );
}

function HelpTip({ content, label }: { content: string; label: string }) {
  return (
    <Tooltip content={content} side="top">
      <button
        aria-label={label}
        className="inline-flex size-5 items-center justify-center rounded-full text-slate-400 hover:text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-orange dark:hover:text-slate-200"
        type="button"
      >
        <CircleHelp className="size-3.5" />
      </button>
    </Tooltip>
  );
}

function ExpenseReceipt({
  expense,
  onClose,
  onEdit,
  t,
}: {
  expense: ExpenseRecord;
  onClose: () => void;
  onEdit: (expense: ExpenseRecord) => void;
  t: ReturnType<typeof useTranslations>;
}) {
  const details = [
    [t("fields.category"), expense.category_label],
    [t("fields.payee"), expense.payee || "—"],
    [t("fields.description"), expense.description || "—"],
    [t("fields.paymentMethod"), expense.payment_method_label],
    [t("fields.reference"), expense.reference || "—"],
    [t("fields.date"), new Date(expense.incurred_at).toLocaleString()],
    [t("expenses.recordedBy"), expense.recorded_by_email || "—"],
    [t("fields.notes"), expense.notes || "—"],
  ];

  return (
    <section className={panel} aria-labelledby="expense-receipt-title">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-200 pb-4 dark:border-slate-800">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-orange-600">
            {t("expenses.receiptEyebrow")}
          </p>
          <h2 className="mt-1 text-lg font-bold" id="expense-receipt-title">
            {expense.expense_number || t("expenses.expense")}
          </h2>
          <p className="mt-1 text-xs text-slate-500">{t("expenses.receiptHelp")}</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => onEdit(expense)} size="small" type="button" variant="outline">
            <Pencil className="size-4" />
            {t("actions.edit")}
          </Button>
          <Button aria-label={t("actions.close")} onClick={onClose} size="small" type="button" variant="ghost">
            <X className="size-4" />
          </Button>
        </div>
      </div>

      <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <div className="rounded-xl bg-slate-50 p-4 dark:bg-slate-900">
          <p className="text-xs font-semibold text-slate-500">{t("fields.amount")}</p>
          <p className="mt-1 text-2xl font-bold">{money(expense.amount)}</p>
        </div>
        {details.map(([label, value]) => (
          <div className="min-w-0 rounded-xl border border-slate-200 p-4 dark:border-slate-800" key={label}>
            <p className="text-xs font-semibold text-slate-500">{label}</p>
            <p className="mt-1 break-words text-sm font-medium">{value}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

function ExpensesWorkspace({ businessId }: { businessId: string }) {
  const t = useTranslations("CommerceFinance");
  const { accessToken } = useIdentitySession();
  const { notify } = useNotification();
  const [expenses, setExpenses] = useState<ExpenseRecord[]>([]);
  const [summary, setSummary] = useState<ExpenseSummary>({
    total: "0",
    category_totals: [],
  });
  const [month, setMonth] = useState(monthLocal());
  const [categoryFilter, setCategoryFilter] = useState<"" | ExpenseCategory>("");
  const [editingExpense, setEditingExpense] = useState<ExpenseRecord | null>(null);
  const [receiptExpense, setReceiptExpense] = useState<ExpenseRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const load = useCallback(
    async (signal?: AbortSignal) => {
      if (!accessToken) return;
      try {
        const response = await getExpenses(
          businessId,
          accessToken,
          { month, category: categoryFilter || undefined },
          signal,
        );
        setExpenses(response.data?.expenses ?? []);
        setSummary(
          response.data?.summary ?? { total: "0", category_totals: [] },
        );
      } catch (error) {
        if (!isRequestCancelled(error)) {
          notify({ message: t("expenses.loadError"), tone: "error" });
        }
      } finally {
        if (!signal?.aborted) setLoading(false);
      }
    },
    [accessToken, businessId, categoryFilter, month, notify, t],
  );

  useEffect(() => {
    const controller = new AbortController();
    const task = window.setTimeout(() => void load(controller.signal), 0);
    return () => {
      window.clearTimeout(task);
      controller.abort();
    };
  }, [load]);

  function beginEdit(expense: ExpenseRecord) {
    setEditingExpense(expense);
    setReceiptExpense(expense);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!accessToken) return;
    const form = event.currentTarget;
    const values = Object.fromEntries(new FormData(form));
    const body = {
      category: String(values.category) as ExpenseCategory,
      description: String(values.description ?? ""),
      amount: String(values.amount),
      payee: String(values.payee ?? ""),
      payment_method: String(values.payment_method) as ExpensePaymentMethod,
      reference: String(values.reference ?? ""),
      notes: String(values.notes ?? ""),
      incurred_at: new Date(String(values.incurred_at)).toISOString(),
    };

    setBusy(true);
    try {
      const response = editingExpense
        ? await updateExpense(
            businessId,
            editingExpense.id,
            accessToken,
            body,
          )
        : await createExpense(businessId, accessToken, body);
      const saved = response.data ?? null;
      if (saved) setReceiptExpense(saved);
      notify({
        message: editingExpense
          ? t("expenses.updated")
          : t("expenses.saved"),
        tone: "success",
      });
      setEditingExpense(null);
      form.reset();
      await load();
    } catch {
      notify({
        message: editingExpense
          ? t("expenses.updateError")
          : t("expenses.saveError"),
        tone: "error",
      });
    } finally {
      setBusy(false);
    }
  }

  const formKey = editingExpense?.id ?? "new-expense";

  return (
    <TooltipProvider>
      <section className="mx-auto w-full max-w-6xl space-y-6 px-4 py-6 sm:px-6 lg:px-8">
        <header className="border-b border-slate-200 pb-5 dark:border-slate-800">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-orange-600">
            {t("eyebrow")}
          </p>
          <div className="mt-1 flex items-center gap-2">
            <h1 className="text-2xl font-bold">{t("expenses.title")}</h1>
            <HelpTip content={t("expenses.tooltip")} label={t("help")} />
          </div>
          <p className="mt-1 max-w-3xl text-sm text-slate-500">
            {t("expenses.description")}
          </p>
        </header>

        <form className={`${panel} grid gap-4`} key={formKey} onSubmit={submit}>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="font-bold">
                {editingExpense
                  ? t("expenses.editFormTitle", {
                      number: editingExpense.expense_number,
                    })
                  : t("expenses.formTitle")}
              </h2>
              {editingExpense ? (
                <p className="mt-1 text-xs text-slate-500">
                  {t("expenses.editHelp")}
                </p>
              ) : null}
            </div>
            {editingExpense ? (
              <Button
                onClick={() => setEditingExpense(null)}
                size="small"
                type="button"
                variant="ghost"
              >
                {t("actions.cancel")}
              </Button>
            ) : null}
          </div>

          <div className="grid min-w-0 gap-4 md:grid-cols-2">
            <label className={field}>
              {t("fields.category")}
              <Select defaultValue={editingExpense?.category ?? ""} name="category" required>
                <option disabled value="">{t("placeholders.category")}</option>
                {categories.map((category) => (
                  <option key={category} value={category}>{t(`categories.${category}`)}</option>
                ))}
              </Select>
            </label>
            <label className={field}>
              {t("fields.amount")}
              <Input className="w-full min-w-0" defaultValue={editingExpense?.amount ?? ""} min="0.01" name="amount" required step="0.01" type="number" />
            </label>
          </div>

          <div className="grid min-w-0 gap-4 md:grid-cols-2">
            <label className={field}>
              {t("fields.date")}
              <Input className="w-full min-w-0" defaultValue={editingExpense ? localDateTimeInput(editingExpense.incurred_at) : nowLocal()} name="incurred_at" required type="datetime-local" />
            </label>
            <label className={field}>
              {t("fields.payee")}
              <Input className="w-full min-w-0" defaultValue={editingExpense?.payee ?? ""} name="payee" placeholder={t("placeholders.payee")} />
            </label>
          </div>

          <label className={field}>
            {t("fields.description")}
            <Input defaultValue={editingExpense?.description ?? ""} name="description" placeholder={t("placeholders.description")} />
          </label>

          <div className="grid min-w-0 gap-4 md:grid-cols-2">
            <label className={field}>
              {t("fields.paymentMethod")}
              <Select defaultValue={editingExpense?.payment_method ?? "cash"} name="payment_method">
                {paymentMethods.map((method) => (
                  <option key={method} value={method}>{t(`paymentMethods.${method}`)}</option>
                ))}
              </Select>
            </label>
            <label className={field}>
              {t("fields.reference")}
              <Input defaultValue={editingExpense?.reference ?? ""} name="reference" placeholder={t("placeholders.reference")} />
            </label>
          </div>

          <label className={field}>
            {t("fields.notes")}
            <Input defaultValue={editingExpense?.notes ?? ""} name="notes" placeholder={t("placeholders.notes")} />
          </label>

          <Button disabled={busy || !accessToken} loading={busy} type="submit">
            {editingExpense ? t("actions.saveChanges") : t("expenses.record")}
          </Button>
        </form>

        {receiptExpense ? (
          <ExpenseReceipt expense={receiptExpense} onClose={() => setReceiptExpense(null)} onEdit={beginEdit} t={t} />
        ) : null}

        <section className={panel} aria-labelledby="expense-view-title">
          <div className="grid gap-4 md:grid-cols-[1fr_12rem_minmax(12rem,16rem)] md:items-end">
            <div>
              <p className="text-xs font-semibold text-slate-500" id="expense-view-title">{t("expenses.periodTotal")}</p>
              <p className="mt-1 text-2xl font-bold">{money(summary.total)}</p>
            </div>
            <label className={field}>
              {t("fields.month")}
              <Input className="w-full min-w-0" onChange={(event) => setMonth(event.target.value)} type="month" value={month} />
            </label>
            <label className={field}>
              {t("fields.category")}
              <Select className="w-full min-w-0" onChange={(event) => setCategoryFilter(event.target.value as "" | ExpenseCategory)} value={categoryFilter}>
                <option value="">{t("filters.allCategories")}</option>
                {categories.map((category) => (
                  <option key={category} value={category}>{t(`categories.${category}`)}</option>
                ))}
              </Select>
            </label>
          </div>
        </section>

        <section className="space-y-3" aria-labelledby="expense-history-title">
          <h2 className="font-bold" id="expense-history-title">{t("expenses.history")}</h2>
          {loading ? <p className="text-sm text-slate-500">{t("loading")}</p> : null}
          {!loading && !expenses.length ? <p className="text-sm text-slate-500">{t("expenses.empty")}</p> : null}
          {expenses.map((expense) => (
            <article className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-950" key={expense.id}>
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <strong className="text-sm">{expense.expense_number || t("expenses.expense")}</strong>
                    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold dark:bg-slate-900">{expense.category_label}</span>
                  </div>
                  <p className="mt-1 break-words text-xs text-slate-500">{[expense.payee, expense.description].filter(Boolean).join(" · ") || t("expenses.noDescription")}</p>
                  <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-slate-500">
                    <span>{new Date(expense.incurred_at).toLocaleString()}</span>
                    <span>{expense.payment_method_label}</span>
                    {expense.reference ? <span>{expense.reference}</span> : null}
                  </div>
                </div>
                <div className="flex shrink-0 flex-col items-start gap-2 sm:items-end">
                  <strong className="text-base">{money(expense.amount)}</strong>
                  <div className="flex gap-2">
                    <Button onClick={() => setReceiptExpense(expense)} size="small" type="button" variant="outline">
                      <ReceiptText className="size-4" />
                      {t("actions.receipt")}
                    </Button>
                    <Button onClick={() => beginEdit(expense)} size="small" type="button" variant="ghost">
                      <Pencil className="size-4" />
                      {t("actions.edit")}
                    </Button>
                  </div>
                </div>
              </div>
            </article>
          ))}
        </section>
      </section>
    </TooltipProvider>
  );
}

export { ExpensesWorkspace };
