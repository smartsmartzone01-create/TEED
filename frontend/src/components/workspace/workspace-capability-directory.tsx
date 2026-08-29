"use client";

import {
  Building2,
  Inbox,
  LayoutDashboard,
  Settings2,
  ShieldCheck,
  ShoppingBag,
  Store,
  type LucideIcon,
} from "lucide-react";
import { useLocale } from "next-intl";
import { type CSSProperties } from "react";

import { Link } from "@/i18n/navigation";

type ToolItem = {
  href: string;
  icon: LucideIcon;
  title: string;
};

function WorkspaceCapabilityDirectory({ businessId }: { businessId: string }) {
  const locale = useLocale();

  const brandedTextStyle = {
    color: "var(--workspace-primary, var(--brand-navy))",
  } as CSSProperties;
  const brandedIconStyle = {
    backgroundColor:
      "color-mix(in srgb, var(--workspace-primary, var(--brand-navy)) 10%, white)",
    color: "var(--workspace-primary, var(--brand-navy))",
  } as CSSProperties;

  const commerceItems: ToolItem[] = [
    {
      href: `/workspace/${businessId}/commerce`,
      icon: LayoutDashboard,
      title: locale === "sw" ? "Hali ya biashara" : "Business Pulse",
    },
    {
      href: `/workspace/${businessId}/commerce/products`,
      icon: Store,
      title: locale === "sw" ? "Bidhaa" : "Available items",
    },
    {
      href: `/workspace/${businessId}/commerce/inventory`,
      icon: Building2,
      title: "Stock",
    },
    {
      href: `/workspace/${businessId}/commerce/sales`,
      icon: ShoppingBag,
      title: locale === "sw" ? "Mauzo" : "Sales",
    },
    {
      href: `/workspace/${businessId}/commerce/returns`,
      icon: Inbox,
      title: locale === "sw" ? "Marejesho" : "Returns",
    },
    {
      href: `/workspace/${businessId}/commerce/expenses`,
      icon: Settings2,
      title: locale === "sw" ? "Gharama" : "Expenses",
    },
    {
      href: `/workspace/${businessId}/commerce/budgets`,
      icon: ShieldCheck,
      title: locale === "sw" ? "Bajeti" : "Budgets",
    },
  ];

  return (
    <div className="space-y-5">
      <header>
        <h1 className="text-xl font-semibold tracking-tight text-slate-950 dark:text-white sm:text-2xl">
          {locale === "sw" ? "Zana zote" : "All Tools"}
        </h1>
        <p className="mt-1 max-w-2xl text-sm text-slate-600 dark:text-slate-300">
          {locale === "sw"
            ? "Fungua sehemu unayohitaji kuendesha biashara yako."
            : "Open the business area you need and start working."}
        </p>
      </header>

      <section className="overflow-hidden rounded-lg border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950">
        <div className="border-b border-slate-200 px-4 py-3 dark:border-slate-800 sm:px-5">
          <h2 className="text-sm font-semibold text-slate-950 dark:text-white">
            {locale === "sw" ? "Biashara" : "Commerce"}
          </h2>
          <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
            {locale === "sw"
              ? "Mauzo, bidhaa, stock, marejesho na fedha za biashara."
              : "Sales, items, stock, returns and business finance."}
          </p>
        </div>

        <div className="grid grid-cols-2 gap-2 p-3 sm:grid-cols-3 sm:gap-3 sm:p-4 lg:grid-cols-4 2xl:grid-cols-5">
          {commerceItems.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                className="group flex min-h-28 min-w-0 flex-col rounded-lg border border-slate-200 bg-white p-3 transition-colors hover:bg-interactive-highlight focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400/40 dark:border-slate-800 dark:bg-slate-950 dark:hover:bg-slate-900 sm:min-h-30 sm:p-3.5"
                href={item.href}
                key={item.href}
              >
                <span
                  className="inline-flex size-8 shrink-0 items-center justify-center rounded-md sm:size-9"
                  style={brandedIconStyle}
                >
                  <Icon className="size-4 sm:size-4.5" />
                </span>
                <h3 className="mt-2.5 line-clamp-2 text-xs font-semibold leading-4 text-slate-950 dark:text-white sm:text-sm sm:leading-5">
                  {item.title}
                </h3>
                <span
                  className="mt-auto inline-flex items-center gap-1 pt-2 text-[11px] font-semibold group-hover:opacity-75 sm:text-xs"
                  style={brandedTextStyle}
                >
                  {locale === "sw" ? "Fungua" : "Open"}
                  <span aria-hidden="true">→</span>
                </span>
              </Link>
            );
          })}
        </div>
      </section>
    </div>
  );
}

export { WorkspaceCapabilityDirectory };
