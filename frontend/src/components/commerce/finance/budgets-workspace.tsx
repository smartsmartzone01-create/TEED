"use client";

import { useTranslations } from "next-intl";
import { useCallback, useEffect, useState, type FormEvent } from "react";

import { Button } from "@/components/global/primitives/button";
import { Input } from "@/components/global/primitives/input";
import { Select } from "@/components/global/primitives/select";
import { useNotification } from "@/providers/global/notification-provider";
import { useIdentitySession } from "@/providers/identity/identity-session-provider";
import { getBudgets, saveBudget } from "@/services/commerce/finance";
import { isRequestCancelled } from "@/services/global/api-client";
import type {
  BudgetPeriodType,
  BudgetRecord,
} from "@/types/commerce/finance";

const panel =
  "rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-950";
const field =
  "grid min-w-0 gap-1.5 text-xs font-semibold text-slate-600 dark:text-slate-300";
const periodTypes: BudgetPeriodType[] = ["daily", "weekly", "monthly"];

function localDate() {
  const date = new Date();
  date.setMinutes(date.getMinutes() - date.getTimezoneOffset());
  return date.toISOString().slice(0, 10);
}

function localMonth() {
  return localDate().slice(0, 7);
}

function initialPeriodValue(periodType: BudgetPeriodType) {
  return periodType === "monthly" ? localMonth() : localDate();
}

function periodStartValue(periodType: BudgetPeriodType, value: string) {
  return periodType === "monthly" ? `${value}-01` : value;
}

function money(value: string) {
  return new Intl.NumberFormat(undefined, { maximumFractionDigits: 2 }).format(
    Number(value),
  );
}

function statusClasses(status: BudgetRecord["status"]) {
  if (status === "over_budget") {
    return "border-red-200 bg-red-50 text-red-700 dark:border-red-900 dark:bg-red-950/30 dark:text-red-300";
  }
  if (status === "approaching_limit") {
    return "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-300";
  }
  return "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-300";
}

function budgetPeriodLabel(budget: BudgetRecord) {
  const start = new Date(`${budget.period_start}T00:00:00`);
  if (budget.period_type === "daily") {
    return start.toLocaleDateString();
  }
  if (budget.period_type === "weekly") {
    const end = new Date(start);
    end.setDate(end.getDate() + 6);
    return `${start.toLocaleDateString()} – ${end.toLocaleDateString()}`;
  }
  return start.toLocaleDateString(undefined, {
    month: "long",
    year: "numeric",
  });
}

function BudgetsWorkspace({ businessId }: { businessId: string }) {
  const t = useTranslations("CommerceFinance");
  const { accessToken } = useIdentitySession();
  const { notify } = useNotification();
  const [budgets, setBudgets] = useState<BudgetRecord[]>([]);
  const [periodType, setPeriodType] = useState<BudgetPeriodType>("monthly");
  const [periodValue, setPeriodValue] = useState(localMonth());
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

  function changePeriodType(value: BudgetPeriodType) {
    setPeriodType(value);
    setPeriodValue(initialPeriodValue(value));
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!accessToken) return;
    const form = event.currentTarget;
    const values = Object.fromEntries(new FormData(form));
    setBusy(true);
    try {
      await saveBudget(businessId, accessToken, {
        period_type: periodType,
        period_start: periodStartValue(periodType, periodValue),
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
    <section className="mx-auto w-full max-w-6xl space-y-6 px-4 py-6 sm:px-6 lg:px-8">
      <header className="border-b border-slate-200 pb-5 dark:border-slate-800">
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-orange-600">
          {t("eyebrow")}
        </p>
        <h1 className="mt-1 text-2xl font-bold">{t("budgets.title")}</h1>
        <p className="mt-1 max-w-3xl text-sm text-slate-500">
          {t("budgets.description")}
        </p>
      </header>

      <form className={`${panel} grid gap-4`} onSubmit={submit}>
        <div>
          <h2 className="font-bold">{t("budgets.formTitle")}</h2>
          <p className="mt-1 text-xs leading-5 text-slate-500">
            {t(`budgets.scope.${periodType}`)}
          </p>
        </div>

        <div className="grid min-w-0 gap-4 md:grid-cols-2">
          <label className={field}>
            {t("fields.budgetPeriod")}
            <Select
              onChange={(event) =>
                changePeriodType(event.target.value as BudgetPeriodType)
              }
              value={periodType}
            >
              {periodTypes.map((type) => (
                <option key={type} value={type}>
                  {t(`budgetPeriods.${type}`)}
                </option>
              ))}
            </Select>
          </label>

          <label className={field}>
            {periodType === "monthly"
              ? t("fields.month")
              : periodType === "weekly"
                ? t("fields.week")
                : t("fields.day")}
            <Input
              className="w-full min-w-0"
              onChange={(event) => setPeriodValue(event.target.value)}
              required
              type={periodType === "monthly" ? "month" : "date"}
              value={periodValue}
            />
          </label>
        </div>

        <label className={field}>
          {t("fields.plannedAmount")}
          <Input
            min="0.01"
            name="planned_amount"
            required
            step="0.01"
            type="number"
          />
        </label>

        <label className={field}>
          {t("fields.notes")}
          <Input name="notes" placeholder={t("placeholders.budgetNotes")} />
        </label>

        <Button disabled={busy || !accessToken} loading={busy} type="submit">
          {t("budgets.save")}
        </Button>
      </form>

      <section className="space-y-3" aria-labelledby="budget-performance-title">
        <div>
          <h2 className="font-bold" id="budget-performance-title">
            {t("budgets.current")}
          </h2>
          <p className="mt-1 text-xs text-slate-500">
            {t("budgets.reportingHelp")}
          </p>
        </div>

        {loading ? (
          <p className="text-sm text-slate-500">{t("loading")}</p>
        ) : null}
        {!loading && !budgets.length ? (
          <p className="text-sm text-slate-500">{t("budgets.empty")}</p>
        ) : null}

        {budgets.map((budget) => (
          <article
            className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-950"
            key={budget.id}
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <strong className="text-sm">
                    {t(`budgetPeriods.${budget.period_type}`)}
                  </strong>
                  <span
                    className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold ${statusClasses(budget.status)}`}
                  >
                    {t(`budgetStatus.${budget.status}`)}
                  </span>
                </div>
                <p className="mt-1 text-xs text-slate-500">
                  {budgetPeriodLabel(budget)}
                </p>
              </div>
              <div className="text-right">
                <p className="text-xs text-slate-500">{t("budgets.planned")}</p>
                <strong>{money(budget.planned_amount)}</strong>
              </div>
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              <div>
                <p className="text-xs text-slate-500">{t("budgets.actual")}</p>
                <strong className="mt-1 block">{money(budget.actual_amount)}</strong>
              </div>
              <div>
                <p className="text-xs text-slate-500">{t("budgets.remaining")}</p>
                <strong className="mt-1 block">
                  {money(budget.remaining_amount)}
                </strong>
              </div>
              <div>
                <p className="text-xs text-slate-500">{t("budgets.used")}</p>
                <strong className="mt-1 block">
                  {budget.utilization_percent}%
                </strong>
              </div>
            </div>

            <div className="mt-4 border-t border-slate-100 pt-3 text-xs text-slate-500 dark:border-slate-800">
              <p>
                {t("budgets.expenseSpend")}: {money(budget.operating_expenses)}
              </p>
              {budget.period_type === "monthly" ? (
                <p className="mt-1">
                  {t("budgets.stockSpend")}: {money(budget.stock_purchases)}
                </p>
              ) : null}
              {budget.notes ? <p className="mt-2">{budget.notes}</p> : null}
            </div>
          </article>
        ))}
      </section>
    </section>
  );
}

export { BudgetsWorkspace };
