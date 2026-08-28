"use client";

import { CircleHelp, Gauge, PiggyBank } from "lucide-react";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useState, type FormEvent } from "react";

import { Button } from "@/components/global/primitives/button";
import { Input } from "@/components/global/primitives/input";
import { Select } from "@/components/global/primitives/select";
import { Tooltip, TooltipProvider } from "@/components/global/primitives/tooltip";
import { useNotification } from "@/providers/global/notification-provider";
import { useIdentitySession } from "@/providers/identity/identity-session-provider";
import { getBudgets, saveBudget } from "@/services/commerce/finance";
import { isRequestCancelled } from "@/services/global/api-client";
import type { BudgetRecord, ExpenseCategory } from "@/types/commerce/finance";

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

const monthLocal = () => {
  const date = new Date();
  date.setMinutes(date.getMinutes() - date.getTimezoneOffset());
  return date.toISOString().slice(0, 7);
};

function money(value: string) {
  return new Intl.NumberFormat(undefined, { maximumFractionDigits: 2 }).format(Number(value));
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

function statusClasses(status: BudgetRecord["status"]) {
  if (status === "over_budget") return "border-red-200 bg-red-50 text-red-700 dark:border-red-900 dark:bg-red-950/30 dark:text-red-300";
  if (status === "approaching_limit") return "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-300";
  return "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-300";
}

function BudgetsWorkspace({ businessId }: { businessId: string }) {
  const t = useTranslations("CommerceFinance");
  const { accessToken } = useIdentitySession();
  const { notify } = useNotification();
  const [budgets, setBudgets] = useState<BudgetRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const load = useCallback(
    async (signal?: AbortSignal) => {
      if (!accessToken) return;
      try {
        const response = await getBudgets(businessId, accessToken, signal);
        setBudgets(response.data?.budgets ?? []);
      } catch (error) {
        if (!isRequestCancelled(error)) {
          notify({ message: t("budgets.loadError"), tone: "error" });
        }
      } finally {
        if (!signal?.aborted) setLoading(false);
      }
    },
    [accessToken, businessId, notify, t],
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
      await saveBudget(businessId, accessToken, {
        category: String(values.category) as ExpenseCategory,
        month: `${String(values.month)}-01`,
        planned_amount: String(values.planned_amount),
        notes: String(values.notes ?? ""),
      });
      notify({ message: t("budgets.saved"), tone: "success" });
      await load();
    } catch {
      notify({ message: t("budgets.saveError"), tone: "error" });
    } finally {
      setBusy(false);
    }
  }

  return (
    <TooltipProvider>
      <section className="mx-auto w-full max-w-7xl space-y-6 px-4 py-6 sm:px-6 lg:px-8">
        <header className="border-b border-slate-200 pb-5 dark:border-slate-800">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-orange-600">{t("eyebrow")}</p>
          <div className="mt-1 flex items-center gap-2">
            <h1 className="text-2xl font-bold">{t("budgets.title")}</h1>
            <HelpTip content={t("budgets.tooltip")} label={t("help")} />
          </div>
          <p className="mt-1 max-w-3xl text-sm text-slate-500">{t("budgets.description")}</p>
        </header>

        <div className="grid gap-5 xl:grid-cols-[0.75fr_1.25fr]">
          <form className={`${panel} grid gap-4 self-start`} onSubmit={submit}>
            <div className="flex items-center gap-2">
              <PiggyBank className="size-5 text-orange-600" />
              <h2 className="font-bold">{t("budgets.formTitle")}</h2>
            </div>
            <label className={field}>
              {t("fields.category")}
              <Select name="category" required defaultValue="">
                <option disabled value="">{t("placeholders.category")}</option>
                {categories.map((category) => (
                  <option key={category} value={category}>{t(`categories.${category}`)}</option>
                ))}
              </Select>
            </label>
            <label className={field}>
              {t("fields.month")}
              <Input defaultValue={monthLocal()} name="month" required type="month" />
            </label>
            <label className={field}>
              {t("fields.plannedAmount")}
              <Input min="0.01" name="planned_amount" required step="0.01" type="number" />
            </label>
            <label className={field}>
              {t("fields.notes")}
              <Input name="notes" placeholder={t("placeholders.budgetNotes")} />
            </label>
            <Button disabled={busy || !accessToken} loading={busy} type="submit">
              {t("budgets.save")}
            </Button>
            <p className="text-xs leading-5 text-slate-500">{t("budgets.formHelp")}</p>
          </form>

          <div className={panel}>
            <div className="flex items-center gap-2">
              <Gauge className="size-5 text-orange-600" />
              <h2 className="font-bold">{t("budgets.current")}</h2>
            </div>
            <div className="mt-4 space-y-3">
              {loading ? <p className="text-sm text-slate-500">{t("loading")}</p> : null}
              {!loading && !budgets.length ? <p className="text-sm text-slate-500">{t("budgets.empty")}</p> : null}
              {budgets.map((budget) => {
                const progress = Math.max(0, Math.min(100, Number(budget.utilization_percent)));
                return (
                  <article className="rounded-2xl border border-slate-200 p-4 dark:border-slate-800" key={budget.id}>
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <strong className="text-sm">{budget.category_label}</strong>
                          <span className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold ${statusClasses(budget.status)}`}>
                            {t(`budgetStatus.${budget.status}`)}
                          </span>
                        </div>
                        <p className="mt-1 text-xs text-slate-500">{new Date(`${budget.month}T00:00:00`).toLocaleDateString(undefined, { month: "long", year: "numeric" })}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-slate-500">{t("budgets.planned")}</p>
                        <strong>{money(budget.planned_amount)}</strong>
                      </div>
                    </div>
                    <div className="mt-4 h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-900">
                      <div className="h-full rounded-full bg-orange-500 transition-[width]" style={{ width: `${progress}%` }} />
                    </div>
                    <div className="mt-3 grid grid-cols-3 gap-3 text-xs">
                      <div><p className="text-slate-500">{t("budgets.actual")}</p><strong className="mt-1 block">{money(budget.actual_amount)}</strong></div>
                      <div><p className="text-slate-500">{t("budgets.remaining")}</p><strong className="mt-1 block">{money(budget.remaining_amount)}</strong></div>
                      <div><p className="text-slate-500">{t("budgets.used")}</p><strong className="mt-1 block">{budget.utilization_percent}%</strong></div>
                    </div>
                    {budget.notes ? <p className="mt-3 border-t border-slate-100 pt-3 text-xs text-slate-500 dark:border-slate-800">{budget.notes}</p> : null}
                  </article>
                );
              })}
            </div>
          </div>
        </div>
      </section>
    </TooltipProvider>
  );
}

export { BudgetsWorkspace };
