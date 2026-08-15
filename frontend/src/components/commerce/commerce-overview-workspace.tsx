"use client";

import { ArrowRight, Boxes, CircleDollarSign, PackageX, ReceiptText } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { useTranslations } from "next-intl";

import { Link } from "@/i18n/navigation";
import { useIdentitySession } from "@/providers/identity/identity-session-provider";
import { useNotification } from "@/providers/global/notification-provider";
import { getCommerceOverview } from "@/services/commerce/commerce";
import type { CommerceOverview } from "@/types/commerce/commerce";

function money(value: string | null | undefined) {
  if (value == null) return "—";
  return new Intl.NumberFormat(undefined, { maximumFractionDigits: 2 }).format(
    Number(value),
  );
}

function SectionLink({ href, label }: { href: string; label: string }) {
  return (
    <Link
      className="inline-flex items-center gap-1 text-xs font-semibold text-slate-500 hover:text-slate-950 dark:hover:text-white"
      href={href as never}
    >
      {label}
      <ArrowRight className="size-3.5" />
    </Link>
  );
}

function CommerceOverviewWorkspace({ businessId }: { businessId: string }) {
  const t = useTranslations("Commerce");
  const { accessToken } = useIdentitySession();
  const { notify } = useNotification();
  const [data, setData] = useState<CommerceOverview | null>(null);

  const load = useCallback(async () => {
    if (!accessToken) return;
    try {
      const response = await getCommerceOverview(businessId, accessToken);
      setData(response.data ?? null);
    } catch (reason) {
      notify({
        message: reason instanceof Error ? reason.message : t("errors.load"),
        tone: "error",
      });
    }
  }, [accessToken, businessId, notify, t]);

  useEffect(() => {
    const initial = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(initial);
  }, [load]);

  return (
    <section className="w-full space-y-4 px-2 py-4 sm:px-3 lg:px-4">
      <header className="border-b border-slate-200 pb-4 dark:border-slate-800">
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-orange-600">
          {t("eyebrow")}
        </p>
        <h1 className="mt-1 text-2xl font-bold text-slate-950 dark:text-white">
          {t("views.overview.title")}
        </h1>
        <p className="mt-1 max-w-2xl text-sm text-slate-500">
          {t("views.overview.description")}
        </p>
      </header>

      {data ? (
        <>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {[
              [CircleDollarSign, t("pulse.revenue"), money(data.pulse.revenue)],
              [ReceiptText, t("pulse.sales"), String(data.pulse.sales_count)],
              [Boxes, t("pulse.availableSkus"), String(data.pulse.available_skus)],
              [PackageX, t("pulse.soldOutSkus"), String(data.pulse.sold_out_skus)],
            ].map(([Icon, label, value]) => {
              const IconComponent = Icon as typeof Boxes;
              return (
                <div
                  className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-950"
                  key={String(label)}
                >
                  <IconComponent className="size-4 text-slate-500" />
                  <p className="mt-3 text-xs font-medium text-slate-500">{String(label)}</p>
                  <p className="mt-1 text-xl font-semibold">{String(value)}</p>
                </div>
              );
            })}
          </div>

          <div className="grid gap-4 xl:grid-cols-2">
            <section className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-950">
              <div className="flex items-center justify-between gap-3">
                <h2 className="font-semibold">{t("overview.recentStock")}</h2>
                <SectionLink
                  href={`/workspace/${businessId}/commerce/inventory`}
                  label={t("actions.viewMore")}
                />
              </div>
              <div className="mt-3 divide-y divide-slate-200 dark:divide-slate-800">
                {data.recent_stock.map((receipt) => (
                  <div className="py-3 text-sm" key={receipt.id}>
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <strong>{receipt.reference}</strong>
                        <p className="mt-1 text-xs text-slate-500">
                          {receipt.supplier_name || t("fields.supplierNotEntered")}
                        </p>
                      </div>
                      <span className="text-xs text-slate-500">
                        {receipt.quantities_by_unit
                          .map((item) => `${item.quantity} ${item.unit}`)
                          .join(" · ") || "—"}
                      </span>
                    </div>
                  </div>
                ))}
                {!data.recent_stock.length ? (
                  <p className="py-3 text-sm text-slate-500">{t("empty.stock")}</p>
                ) : null}
              </div>
            </section>

            <section className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-950">
              <div className="flex items-center justify-between gap-3">
                <h2 className="font-semibold">{t("recentSales")}</h2>
                <SectionLink
                  href={`/workspace/${businessId}/commerce/sales`}
                  label={t("actions.viewMore")}
                />
              </div>
              <div className="mt-3 divide-y divide-slate-200 dark:divide-slate-800">
                {data.recent_sales.map((sale) => (
                  <div className="flex justify-between gap-3 py-3 text-sm" key={sale.id}>
                    <span>{sale.receipt_number}</span>
                    <strong>{money(sale.total)}</strong>
                  </div>
                ))}
                {!data.recent_sales.length ? (
                  <p className="py-3 text-sm text-slate-500">{t("empty.sales")}</p>
                ) : null}
              </div>
            </section>

            <section className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-950">
              <div className="flex items-center justify-between gap-3">
                <h2 className="font-semibold">{t("overview.soldOut")}</h2>
                <SectionLink
                  href={`/workspace/${businessId}/commerce/products`}
                  label={t("actions.viewMore")}
                />
              </div>
              <div className="mt-3 divide-y divide-slate-200 dark:divide-slate-800">
                {data.sold_out_items.map((product) => (
                  <div className="flex justify-between gap-3 py-3 text-sm" key={product.id}>
                    <span>{product.name}</span>
                    <span className="text-xs font-semibold text-slate-500">
                      {t("values.soldOut")}
                    </span>
                  </div>
                ))}
                {!data.sold_out_items.length ? (
                  <p className="py-3 text-sm text-slate-500">{t("empty.soldOut")}</p>
                ) : null}
              </div>
            </section>

            <section className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-950">
              <div className="flex items-center justify-between gap-3">
                <h2 className="font-semibold">{t("overview.recentReturns")}</h2>
                <SectionLink
                  href={`/workspace/${businessId}/commerce/returns`}
                  label={t("actions.viewMore")}
                />
              </div>
              <div className="mt-3 divide-y divide-slate-200 dark:divide-slate-800">
                {data.recent_returns.map((record) => (
                  <div className="py-3 text-sm" key={record.id}>
                    <div className="flex justify-between gap-3">
                      <span>{record.receipt_number}</span>
                      <strong>{money(record.total)}</strong>
                    </div>
                    <p className="mt-1 truncate text-xs text-slate-500">{record.reason}</p>
                  </div>
                ))}
                {!data.recent_returns.length ? (
                  <p className="py-3 text-sm text-slate-500">{t("empty.returns")}</p>
                ) : null}
              </div>
            </section>
          </div>
        </>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {[1, 2, 3, 4].map((item) => (
            <div
              className="h-28 animate-pulse rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950"
              key={item}
            />
          ))}
        </div>
      )}
    </section>
  );
}

export { CommerceOverviewWorkspace };
