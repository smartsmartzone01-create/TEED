"use client";

import { Banknote, ReceiptText, ShoppingBag, TrendingUp } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useMemo } from "react";

import type { Sale } from "@/types/commerce/sales";

const primaryAccent =
  "text-[var(--workspace-primary,var(--brand-navy))] dark:[color:color-mix(in_srgb,var(--workspace-primary,var(--brand-navy))_35%,white)]";
const secondaryAccent =
  "text-[var(--workspace-secondary,var(--brand-orange))] dark:[color:color-mix(in_srgb,var(--workspace-secondary,var(--brand-orange))_42%,white)]";

function startOfDay(value: Date) {
  return new Date(value.getFullYear(), value.getMonth(), value.getDate());
}

function startOfWeek(value: Date) {
  const start = startOfDay(value);
  start.setDate(start.getDate() - ((start.getDay() + 6) % 7));
  return start;
}

function SalesStatusCard({ sales }: { sales: Sale[] }) {
  const t = useTranslations("CommerceSales");
  const locale = useLocale();

  const status = useMemo(() => {
    const now = new Date();
    const todayStart = startOfDay(now);
    const tomorrowStart = new Date(todayStart);
    tomorrowStart.setDate(tomorrowStart.getDate() + 1);
    const weekStart = startOfWeek(now);
    const activeSales = sales.filter((sale) => sale.status === "active");
    const todaySales = activeSales.filter((sale) => {
      const soldAt = new Date(sale.sold_at);
      return soldAt >= todayStart && soldAt < tomorrowStart;
    });

    const topProducts = new Map<string, { name: string; quantity: number }>();
    for (const sale of activeSales) {
      const soldAt = new Date(sale.sold_at);
      if (Number.isNaN(soldAt.getTime()) || soldAt < weekStart) continue;
      for (const item of sale.items) {
        const quantity = Math.max(
          0,
          Number(item.quantity || 0) - Number(item.returned_quantity || 0),
        );
        if (!Number.isFinite(quantity) || quantity <= 0) continue;
        const key = item.product || `manual:${item.product_name || item.item_name}`;
        const current = topProducts.get(key);
        topProducts.set(key, {
          name: item.product_name || item.item_name,
          quantity: (current?.quantity ?? 0) + quantity,
        });
      }
    }

    let topSeller = "";
    let topQuantity = -1;
    for (const product of topProducts.values()) {
      if (product.quantity > topQuantity) {
        topSeller = product.name;
        topQuantity = product.quantity;
      }
    }

    return {
      countToday: todaySales.length,
      revenueToday: todaySales.reduce((total, sale) => {
        const amount = Number(sale.total || 0);
        return total + (Number.isFinite(amount) ? amount : 0);
      }, 0),
      topSeller,
    };
  }, [sales]);

  const revenueText = new Intl.NumberFormat(locale, {
    maximumFractionDigits: 2,
  }).format(status.revenueToday);

  const metrics = [
    {
      key: "today",
      label: t("status.salesToday"),
      value: String(status.countToday),
      icon: ReceiptText,
      accent: primaryAccent,
    },
    {
      key: "revenue",
      label: t("status.revenueToday"),
      value: revenueText,
      icon: Banknote,
      accent: secondaryAccent,
    },
    {
      key: "top",
      label: t("status.topSellerWeek"),
      value: status.topSeller || t("status.noSalesWeek"),
      icon: TrendingUp,
      accent: primaryAccent,
    },
  ];

  return (
    <section
      aria-label={t("status.title")}
      className="rounded-lg border border-slate-200 bg-white px-3 py-2.5 dark:border-slate-800 dark:bg-slate-950 sm:px-4 sm:py-3"
    >
      <div className="mb-2 flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2">
          <span className="inline-flex size-7 shrink-0 items-center justify-center rounded-md bg-[color-mix(in_srgb,var(--workspace-primary,var(--brand-navy))_10%,white)] text-[var(--workspace-primary,var(--brand-navy))] dark:bg-[color-mix(in_srgb,var(--workspace-primary,var(--brand-navy))_20%,transparent)] dark:[color:color-mix(in_srgb,var(--workspace-primary,var(--brand-navy))_35%,white)]">
            <ShoppingBag className="size-3.5" />
          </span>
          <h2 className="truncate text-sm font-semibold text-slate-950 dark:text-white">
            {t("status.title")}
          </h2>
        </div>
        <span className="hidden text-[10px] text-slate-400 sm:inline">
          {t("status.context")}
        </span>
      </div>

      <div className="grid grid-cols-3 divide-x divide-slate-200 overflow-hidden rounded-md bg-slate-50 dark:divide-slate-800 dark:bg-slate-900/55">
        {metrics.map((metric) => {
          const Icon = metric.icon;
          return (
            <div className="min-w-0 px-2 py-2 sm:px-3" key={metric.key}>
              <div className="flex items-center gap-1">
                <Icon className={`size-3 shrink-0 ${metric.accent}`} />
                <p className="truncate text-[10px] font-semibold uppercase tracking-[0.04em] text-slate-500 dark:text-slate-400">
                  {metric.label}
                </p>
              </div>
              <p className="mt-0.5 truncate text-[11px] font-semibold text-slate-950 dark:text-white sm:text-xs">
                {metric.value}
              </p>
            </div>
          );
        })}
      </div>
    </section>
  );
}

export { SalesStatusCard };
