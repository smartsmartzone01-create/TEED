"use client";

import { CircleHelp, ReceiptText } from "lucide-react";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useState, type FormEvent } from "react";

import { Button } from "@/components/global/primitives/button";
import { Input } from "@/components/global/primitives/input";
import { Select } from "@/components/global/primitives/select";
import { Tooltip, TooltipProvider } from "@/components/global/primitives/tooltip";
import { useNotification } from "@/providers/global/notification-provider";
import { useIdentitySession } from "@/providers/identity/identity-session-provider";
import { createExpense, getExpenses } from "@/services/commerce/finance";
import { isRequestCancelled } from "@/services/global/api-client";
import type {
  ExpenseCategory,
  ExpensePaymentMethod,
  ExpenseRecord,
  ExpenseSummary,
} from "@/types/commerce/finance";

const panel =
  "rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-950";
const field = "grid gap-1.5 text-xs font-semibold text-slate-600 dark:text-slate-300";
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

function ExpensesWorkspace({ businessId }: { businessId: string }) {
  const t = useTranslations("CommerceFinance");
  const { accessToken } = useIdentitySession();
  const { notify } = useNotification();
  const [expenses, setExpenses] = useState<ExpenseRecord[]>([]);
  const [summary, setSummary] = useState<ExpenseSummary>({ total: "0", category_totals: [] });
  const [month, setMonth] = useState(monthLocal());
  const [categoryFilter, setCategoryFilter] = useState<"" | ExpenseCategory>("");
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
        setSummary(response.data?.summary ?? { total: "0", category_totals: [] });
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

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!accessToken) return;
    const form = event.currentTarget;
    const values = Object.fromEntries(new FormData(form));
    setBusy(true);
    try {
      await createExpense(businessId, accessToken, {
        category: String(values.category) as ExpenseCategory,
        description: String(values.description ?? ""),
        amount: String(values.amount),
        payee: String(values.payee ?? ""),
        payment_method: String(values.payment_method) as ExpensePaymentMethod,
        reference: String(values.reference ?? ""),
        notes: String(values.notes ?? ""),
        incurred_at: new Date(String(values.incurred_at)).toISOString(),
      });
      notify({ message: t("expenses.saved"), tone: "success" });
      form.reset();
      const dateInput = form.elements.namedItem("incurred_at") as HTMLInputElement | null;
      if (dateInput) dateInput.value = nowLocal();
      const paymentInput = form.elements.namedItem("payment_method") as HTMLSelectElement | null;
      if (paymentInput) paymentInput.value = "cash";
      await load();
    } catch {
      notify({ message: t("expenses.saveError"), tone: "error" });
    } finally {
      setBusy(false);
    }
  }

  return (
    <TooltipProvider>
      <section className="mx-auto w-full max-w-7xl space-y-6 px-4 py-6 sm:px-6 lg:px-8">
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

        <div className="grid gap-5 xl:grid-cols-[0.8fr_1.2fr]">
          <form className={`${panel} grid gap-4`} onSubmit={submit}>
            <h2 className="font-bold">{t("expenses.formTitle")}</h2>
            <label className={field}>
              {t("fields.category")}
              <Select name="category" required defaultValue="">
                <option disabled value="">{t("placeholders.category")}</option>
                {categories.map((category) => (
                  <option key={category} value={category}>{t(`categories.${category}`)}</option>
                ))}
              </Select>
            </label>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className={field}>
                {t("fields.amount")}
                <Input min="0.01" name="amount" required step="0.01" type="number" />
              </label>
              <label className={field}>
                {t("fields.date")}
                <Input defaultValue={nowLocal()} name="incurred_at" required type="datetime-local" />
              </label>
            </div>
            <label className={field}>
              {t("fields.payee")}
              <Input name="payee" placeholder={t("placeholders.payee")} />
            </label>
            <label className={field}>
              {t("fields.description")}
              <Input name="description" placeholder={t("placeholders.description")} />
            </label>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className={field}>
                {t("fields.paymentMethod")}
                <Select defaultValue="cash" name="payment_method">
                  {paymentMethods.map((method) => (
                    <option key={method} value={method}>{t(`paymentMethods.${method}`)}</option>
                  ))}
                </Select>
              </label>
              <label className={field}>
                {t("fields.reference")}
                <Input name="reference" placeholder={t("placeholders.reference")} />
              </label>
            </div>
            <label className={field}>
              {t("fields.notes")}
              <Input name="notes" placeholder={t("placeholders.notes")} />
            </label>
            <Button disabled={busy || !accessToken} loading={busy} type="submit">
              {t("expenses.record")}
            </Button>
          </form>

          <div className="space-y-5">
            <div className={`${panel} grid gap-4 sm:grid-cols-[1fr_auto_auto] sm:items-end`}>
              <div>
                <p className="text-xs font-semibold text-slate-500">{t("expenses.periodTotal")}</p>
                <p className="mt-1 text-2xl font-bold">{money(summary.total)}</p>
              </div>
              <label className={field}>
                {t("fields.month")}
                <Input onChange={(event) => setMonth(event.target.value)} type="month" value={month} />
              </label>
              <label className={field}>
                {t("fields.category")}
                <Select onChange={(event) => setCategoryFilter(event.target.value as "" | ExpenseCategory)} value={categoryFilter}>
                  <option value="">{t("filters.allCategories")}</option>
                  {categories.map((category) => (
                    <option key={category} value={category}>{t(`categories.${category}`)}</option>
                  ))}
                </Select>
              </label>
            </div>

            <div className={panel}>
              <div className="flex items-center gap-2">
                <ReceiptText className="size-5 text-orange-600" />
                <h2 className="font-bold">{t("expenses.history")}</h2>
              </div>
              <div className="mt-4 space-y-3">
                {loading ? <p className="text-sm text-slate-500">{t("loading")}</p> : null}
                {!loading && !expenses.length ? <p className="text-sm text-slate-500">{t("expenses.empty")}</p> : null}
                {expenses.map((expense) => (
                  <article className="rounded-xl border border-slate-200 p-4 dark:border-slate-800" key={expense.id}>
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <strong className="text-sm">{expense.expense_number || t("expenses.expense")}</strong>
                          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold dark:bg-slate-900">
                            {expense.category_label}
                          </span>
                        </div>
                        <p className="mt-1 text-xs text-slate-500">
                          {[expense.payee, expense.description].filter(Boolean).join(" · ") || t("expenses.noDescription")}
                        </p>
                      </div>
                      <strong className="text-base">{money(expense.amount)}</strong>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-slate-500">
                      <span>{new Date(expense.incurred_at).toLocaleString()}</span>
                      <span>{t(`paymentMethods.${expense.payment_method}`)}</span>
                      {expense.reference ? <span>{expense.reference}</span> : null}
                    </div>
                  </article>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>
    </TooltipProvider>
  );
}

export { ExpensesWorkspace };
