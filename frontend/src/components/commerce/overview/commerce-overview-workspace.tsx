"use client";

import {
  ArrowRight,
  Boxes,
  CircleDollarSign,
  PiggyBank,
  ReceiptText,
  RotateCcw,
  Sparkles,
  type LucideIcon,
} from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useCallback, useEffect, useState, type CSSProperties } from "react";

import { Link } from "@/i18n/navigation";
import { useIdentitySession } from "@/providers/identity/identity-session-provider";
import { useNotification } from "@/providers/global/notification-provider";
import { getCommerceOverview } from "@/services/commerce/commerce";
import { getBudgets, getExpenses } from "@/services/commerce/finance";
import { getReturnsWorkspace } from "@/services/commerce/returns";
import { getSales } from "@/services/commerce/sales";
import { isRequestCancelled } from "@/services/global/api-client";
import type { CommerceOverview } from "@/types/commerce/commerce";

function money(value: string | number | null | undefined) {
  if (value == null) return "—";
  return new Intl.NumberFormat(undefined, { maximumFractionDigits: 2 }).format(
    Number(value),
  );
}

function localDateKey(value: string | Date) {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return typeof value === "string" ? value.slice(0, 10) : "";
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

type OverviewCardProps = {
  href: string;
  icon: LucideIcon;
  label: string;
  meta: string;
  value: string;
  viewLabel: string;
};

function OverviewCard({
  href,
  icon: Icon,
  label,
  meta,
  value,
  viewLabel,
}: OverviewCardProps) {
  const accentStyle = {
    backgroundColor:
      "color-mix(in srgb, var(--workspace-primary, var(--brand-navy)) 10%, white)",
    color: "var(--workspace-primary, var(--brand-navy))",
  } as CSSProperties;
  const actionStyle = {
    color: "var(--workspace-primary, var(--brand-navy))",
  } as CSSProperties;

  return (
    <Link
      className="group flex min-h-32 min-w-0 flex-col rounded-lg border border-slate-200 bg-white p-3.5 transition-[border-color,box-shadow,transform] hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-[0_6px_18px_rgba(15,23,42,0.06)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400/40 dark:border-slate-800 dark:bg-slate-950 sm:min-h-36 sm:p-4"
      href={href as never}
    >
      <div className="flex items-start gap-3">
        <span
          className="inline-flex size-9 shrink-0 items-center justify-center rounded-lg"
          style={accentStyle}
        >
          <Icon className="size-4" />
        </span>
        <div className="min-w-0">
          <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">
            {label}
          </p>
          <p className="mt-0.5 truncate text-lg font-semibold text-slate-950 dark:text-white sm:text-xl">
            {value}
          </p>
        </div>
      </div>
      <p className="mt-3 line-clamp-2 text-[11px] leading-4 text-slate-500 dark:text-slate-400 sm:text-xs">
        {meta}
      </p>
      <span
        className="mt-auto inline-flex items-center gap-1 pt-3 text-[11px] font-semibold transition-opacity group-hover:opacity-75 sm:text-xs"
        style={actionStyle}
      >
        {viewLabel}
        <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-0.5" />
      </span>
    </Link>
  );
}

function CommerceOverviewWorkspace({ businessId }: { businessId: string }) {
  const t = useTranslations("Commerce");
  const locale = useLocale();
  const { accessToken } = useIdentitySession();
  const { notify } = useNotification();
  const [data, setData] = useState<CommerceOverview | null>(null);
  const [todaySalesCount, setTodaySalesCount] = useState(0);
  const [todaySalesValue, setTodaySalesValue] = useState("0");
  const [todayReturnsCount, setTodayReturnsCount] = useState(0);
  const [todayReturnsValue, setTodayReturnsValue] = useState("0");
  const [todayExpenseTotal, setTodayExpenseTotal] = useState("0");
  const [todayExpenseCount, setTodayExpenseCount] = useState(0);
  const [todayBudgetCount, setTodayBudgetCount] = useState(0);
  const [todayBudgetPlanned, setTodayBudgetPlanned] = useState("0");

  const load = useCallback(
    async (signal?: AbortSignal) => {
      if (!accessToken) return;
      try {
        const response = await getCommerceOverview(businessId, accessToken, signal);
        const overview = response.data ?? null;
        setData(overview);
        if (!overview) return;

        const today = localDateKey(new Date());
        const month = today.slice(0, 7);

        const [salesResult, returnsResult] = await Promise.allSettled([
          getSales(businessId, accessToken, signal),
          getReturnsWorkspace(businessId, accessToken, {}, signal),
        ]);

        if (salesResult.status === "fulfilled") {
          const todaySales = (salesResult.value.data?.sales ?? []).filter(
            (sale) => sale.status === "active" && localDateKey(sale.sold_at) === today,
          );
          setTodaySalesCount(todaySales.length);
          setTodaySalesValue(
            todaySales
              .reduce((total, sale) => total + Number(sale.total || 0), 0)
              .toFixed(2),
          );
        } else {
          setTodaySalesCount(0);
          setTodaySalesValue("0");
        }

        if (returnsResult.status === "fulfilled") {
          const todayReturns = (returnsResult.value.data?.returns ?? []).filter(
            (record) => localDateKey(record.returned_at) === today,
          );
          setTodayReturnsCount(todayReturns.length);
          setTodayReturnsValue(
            todayReturns
              .reduce((total, record) => total + Number(record.total || 0), 0)
              .toFixed(2),
          );
        } else {
          setTodayReturnsCount(0);
          setTodayReturnsValue("0");
        }

        if (overview.pulse.can_manage_finance) {
          const [expenseResult, budgetResult] = await Promise.allSettled([
            getExpenses(businessId, accessToken, { month }, signal),
            getBudgets(businessId, accessToken, signal),
          ]);

          if (expenseResult.status === "fulfilled") {
            const todayExpenses = (expenseResult.value.data?.expenses ?? []).filter(
              (expense) => localDateKey(expense.incurred_at) === today,
            );
            setTodayExpenseCount(todayExpenses.length);
            setTodayExpenseTotal(
              todayExpenses
                .reduce((total, expense) => total + Number(expense.amount || 0), 0)
                .toFixed(2),
            );
          } else {
            setTodayExpenseCount(0);
            setTodayExpenseTotal("0");
          }

          if (budgetResult.status === "fulfilled") {
            const todayBudgets = (budgetResult.value.data?.budgets ?? []).filter(
              (budget) => budget.period_type === "daily" && budget.period_start === today,
            );
            setTodayBudgetCount(todayBudgets.length);
            setTodayBudgetPlanned(
              todayBudgets
                .reduce((total, budget) => total + Number(budget.planned_amount || 0), 0)
                .toFixed(2),
            );
          } else {
            setTodayBudgetCount(0);
            setTodayBudgetPlanned("0");
          }
        } else {
          setTodayExpenseCount(0);
          setTodayExpenseTotal("0");
          setTodayBudgetCount(0);
          setTodayBudgetPlanned("0");
        }
      } catch (reason) {
        if (!isRequestCancelled(reason)) {
          notify({
            message: reason instanceof Error ? reason.message : t("errors.load"),
            tone: "error",
          });
        }
      }
    },
    [accessToken, businessId, notify, t],
  );

  useEffect(() => {
    const controller = new AbortController();
    const initial = window.setTimeout(() => void load(controller.signal), 0);
    return () => {
      window.clearTimeout(initial);
      controller.abort();
    };
  }, [load]);

  const viewLabel = locale === "sw" ? "Tazama" : "View";
  const cards = data
    ? [
        {
          href: `/workspace/${businessId}/commerce/sales`,
          icon: ReceiptText,
          label: locale === "sw" ? "Mauzo" : "Sales",
          meta:
            locale === "sw"
              ? `${todaySalesCount} mauzo yamerekodiwa leo.`
              : `${todaySalesCount} sales recorded today.`,
          value: money(todaySalesValue),
        },
        {
          href: `/workspace/${businessId}/commerce/inventory`,
          icon: Boxes,
          label: "Stock",
          meta:
            locale === "sw"
              ? `${data.pulse.available_skus} bidhaa zinapatikana · ${data.pulse.low_stock_count} zina stock ndogo.`
              : `${data.pulse.available_skus} items available · ${data.pulse.low_stock_count} low stock.`,
          value: money(data.pulse.stock_value),
        },
        {
          href: `/workspace/${businessId}/commerce/returns`,
          icon: RotateCcw,
          label: locale === "sw" ? "Marejesho" : "Returns",
          meta:
            locale === "sw"
              ? `${todayReturnsCount} marejesho yamerekodiwa leo.`
              : `${todayReturnsCount} returns recorded today.`,
          value: money(todayReturnsValue),
        },
        {
          href: `/workspace/${businessId}/commerce/expenses`,
          icon: CircleDollarSign,
          label: locale === "sw" ? "Gharama" : "Expenses",
          meta:
            locale === "sw"
              ? `${todayExpenseCount} gharama zimerekodiwa leo.`
              : `${todayExpenseCount} expenses recorded today.`,
          value: money(todayExpenseTotal),
        },
        {
          href: `/workspace/${businessId}/commerce/budgets`,
          icon: PiggyBank,
          label: locale === "sw" ? "Bajeti" : "Budgets",
          meta:
            locale === "sw"
              ? `${todayBudgetCount} bajeti za kila siku zimewekwa kwa leo.`
              : `${todayBudgetCount} daily budgets set for today.`,
          value: money(todayBudgetPlanned),
        },
      ]
    : [];

  const attentionIconStyle = {
    backgroundColor:
      "color-mix(in srgb, var(--workspace-primary, var(--brand-navy)) 10%, white)",
    color: "var(--workspace-primary, var(--brand-navy))",
  } as CSSProperties;

  return (
    <section className="w-full space-y-5 !px-0 py-4">
      <p className="max-w-3xl text-base font-semibold leading-6 text-slate-950 dark:text-white sm:text-lg">
        {locale === "sw"
          ? "Angalia hali ya jumla ya mauzo, stock, marejesho, gharama na bajeti katika biashara yako."
          : "See the overall state of sales, stock, returns, expenses and budgets across your business."}
      </p>

      {data ? (
        <>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-3 lg:gap-4">
            {cards.map((card) => (
              <OverviewCard {...card} key={card.href} viewLabel={viewLabel} />
            ))}
          </div>

          <section className="rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-950 sm:p-5">
            <div className="flex items-start gap-3">
              <span
                className="inline-flex size-9 shrink-0 items-center justify-center rounded-lg"
                style={attentionIconStyle}
              >
                <Sparkles className="size-4" />
              </span>
              <div>
                <h2 className="text-sm font-semibold text-slate-950 dark:text-white">
                  {locale === "sw" ? "Mambo ya kuzingatia" : "Business attention"}
                </h2>
                <p className="mt-1 text-xs leading-5 text-slate-500 dark:text-slate-400">
                  {t("decisions.description")}
                </p>
              </div>
            </div>

            <div className="mt-4 grid gap-2.5 lg:grid-cols-2">
              {data.decisions.length ? (
                data.decisions.map((decision) => (
                  <Link
                    className="group flex items-start justify-between gap-4 rounded-lg border border-slate-200 p-3 transition-colors hover:bg-interactive-highlight dark:border-slate-800"
                    href={`/workspace/${businessId}${decision.action_path}` as never}
                    key={decision.id}
                  >
                    <div>
                      <p className="text-xs font-semibold text-slate-950 dark:text-white sm:text-sm">
                        {decision.title}
                      </p>
                      <p className="mt-1 text-[11px] leading-4 text-slate-500 dark:text-slate-400 sm:text-xs">
                        {decision.explanation}
                      </p>
                    </div>
                    <ArrowRight className="mt-0.5 size-4 shrink-0 text-slate-400 transition-transform group-hover:translate-x-0.5" />
                  </Link>
                ))
              ) : (
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  {t("decisions.clear")}
                </p>
              )}
            </div>
          </section>
        </>
      ) : (
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-3 lg:gap-4">
          {[1, 2, 3, 4, 5].map((item) => (
            <div
              className="h-32 animate-pulse rounded-lg border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950 sm:h-36"
              key={item}
            />
          ))}
        </div>
      )}
    </section>
  );
}

export { CommerceOverviewWorkspace };
