"use client";

import { PackageSearch, PackageX, TrendingDown, TrendingUp } from "lucide-react";
import { useLocale } from "next-intl";
import { useEffect, useState } from "react";

import { useIdentitySession } from "@/providers/identity/identity-session-provider";
import { getProducts } from "@/services/commerce/catalog";
import { getSales } from "@/services/commerce/sales";
import { isRequestCancelled } from "@/services/global/api-client";
import type { Product } from "@/types/commerce/catalog";

type PerformanceSale = {
  status: string;
  sold_at: string;
  items: Array<{
    source: string;
    product: string;
    product_name: string;
    item_name: string;
    quantity: string;
    returned_quantity: string;
  }>;
};

type StockStatus = {
  runningLow: number;
  outOfStock: number;
  topSeller: string;
};

const primaryAccent =
  "text-[var(--workspace-primary,var(--brand-navy))] dark:[color:color-mix(in_srgb,var(--workspace-primary,var(--brand-navy))_35%,white)]";
const secondaryAccent =
  "text-[var(--workspace-secondary,var(--brand-orange))] dark:[color:color-mix(in_srgb,var(--workspace-secondary,var(--brand-orange))_42%,white)]";

function topProductSince(sales: PerformanceSale[], since: Date) {
  const totals = new Map<string, { name: string; quantity: number }>();

  for (const sale of sales) {
    if (sale.status !== "active") continue;
    const soldAt = new Date(sale.sold_at);
    if (Number.isNaN(soldAt.getTime()) || soldAt < since) continue;

    for (const item of sale.items) {
      if (item.source !== "catalog" || !item.product) continue;
      const soldQuantity = Math.max(
        0,
        Number(item.quantity) - Number(item.returned_quantity || 0),
      );
      if (!Number.isFinite(soldQuantity) || soldQuantity <= 0) continue;

      const current = totals.get(item.product);
      totals.set(item.product, {
        name: item.product_name || item.item_name,
        quantity: (current?.quantity ?? 0) + soldQuantity,
      });
    }
  }

  let top: { name: string; quantity: number } | null = null;
  for (const candidate of totals.values()) {
    if (!top || candidate.quantity > top.quantity) top = candidate;
  }
  return top?.name ?? "";
}

function stockHealth(products: Product[]) {
  const active = products.filter((product) => product.is_active);
  const runningLow = active.filter((product) => {
    const quantity = Number(product.current_quantity);
    const threshold = Number(product.low_stock_threshold);
    return (
      Number.isFinite(quantity) &&
      Number.isFinite(threshold) &&
      threshold > 0 &&
      quantity > 0 &&
      quantity <= threshold
    );
  }).length;
  const outOfStock = active.filter((product) => {
    const quantity = Number(product.current_quantity);
    return Number.isFinite(quantity) && quantity <= 0;
  }).length;

  return { runningLow, outOfStock };
}

function StockStatusCard({ businessId }: { businessId: string }) {
  const locale = useLocale();
  const swahili = locale.toLowerCase().startsWith("sw");
  const { accessToken } = useIdentitySession();
  const [status, setStatus] = useState<StockStatus>({
    runningLow: 0,
    outOfStock: 0,
    topSeller: "",
  });
  const [loadFailed, setLoadFailed] = useState(false);

  useEffect(() => {
    if (!accessToken) return;
    const controller = new AbortController();

    const load = async () => {
      try {
        const [productResponse, salesResponse] = await Promise.all([
          getProducts(businessId, accessToken, controller.signal),
          getSales(businessId, accessToken, controller.signal),
        ]);
        const products = productResponse.data?.products ?? [];
        const sales = (salesResponse.data?.sales ?? []) as PerformanceSale[];
        const now = new Date();
        const weekStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        weekStart.setDate(weekStart.getDate() - ((weekStart.getDay() + 6) % 7));
        const health = stockHealth(products);

        setStatus({
          ...health,
          topSeller: topProductSince(sales, weekStart),
        });
        setLoadFailed(false);
      } catch (reason) {
        if (!isRequestCancelled(reason)) setLoadFailed(true);
      }
    };

    void load();
    return () => controller.abort();
  }, [accessToken, businessId]);

  const labels = {
    title: swahili ? "Hali ya stock" : "Stock status",
    context: swahili ? "Kulingana na stock na mauzo" : "Based on stock and sales",
    low: swahili ? "Stock inapungua" : "Running low",
    out: swahili ? "Imeisha" : "Out of stock",
    top: swahili ? "Inayouza zaidi wiki hii" : "Top seller this week",
    noSales: swahili ? "Hakuna mauzo wiki hii" : "No sales this week",
    unavailable: swahili ? "Haipatikani" : "Unavailable",
  };

  const metrics = [
    {
      key: "low",
      label: labels.low,
      value: loadFailed ? "—" : String(status.runningLow),
      icon: TrendingDown,
      accent: primaryAccent,
    },
    {
      key: "out",
      label: labels.out,
      value: loadFailed ? "—" : String(status.outOfStock),
      icon: PackageX,
      accent: secondaryAccent,
    },
    {
      key: "top",
      label: labels.top,
      value: loadFailed ? labels.unavailable : status.topSeller || labels.noSales,
      icon: TrendingUp,
      accent: primaryAccent,
    },
  ];

  return (
    <section
      aria-label={labels.title}
      className="rounded-lg border border-slate-200 bg-white px-3 py-2.5 dark:border-slate-800 dark:bg-slate-950 sm:px-4 sm:py-3"
    >
      <div className="mb-2 flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2">
          <span className="inline-flex size-7 shrink-0 items-center justify-center rounded-md bg-[color-mix(in_srgb,var(--workspace-primary,var(--brand-navy))_10%,white)] text-[var(--workspace-primary,var(--brand-navy))] dark:bg-[color-mix(in_srgb,var(--workspace-primary,var(--brand-navy))_20%,transparent)] dark:[color:color-mix(in_srgb,var(--workspace-primary,var(--brand-navy))_35%,white)]">
            <PackageSearch className="size-3.5" />
          </span>
          <h2 className="truncate text-sm font-semibold text-slate-950 dark:text-white">
            {labels.title}
          </h2>
        </div>
        <span className="hidden text-[10px] text-slate-400 sm:inline">{labels.context}</span>
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

export { StockStatusCard };
