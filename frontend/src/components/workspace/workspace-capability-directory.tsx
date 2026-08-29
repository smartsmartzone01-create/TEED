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

import { Link } from "@/i18n/navigation";

type ToolItem = {
  href: string;
  icon: LucideIcon;
  title: string;
};

function WorkspaceCapabilityDirectory({ businessId }: { businessId: string }) {
  const locale = useLocale();

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
    <div>
      <header className="mb-6 sm:mb-7">
        <h1 className="text-xl font-semibold tracking-tight text-slate-950 dark:text-white sm:text-2xl">
          {locale === "sw" ? "Zana zote" : "All Tools"}
        </h1>
        <p className="mt-1 max-w-2xl text-sm text-slate-600 dark:text-slate-300">
          {locale === "sw"
            ? "Fungua sehemu ya biashara unayohitaji kuanza kufanya kazi."
            : "Open the business area you need to start working."}
        </p>
      </header>

      <section aria-labelledby="commerce-tools-title">
        <div className="mb-3 sm:mb-4">
          <h2
            className="text-sm font-semibold text-slate-950 dark:text-white sm:text-base"
            id="commerce-tools-title"
          >
            {locale === "sw" ? "Biashara" : "Commerce"}
          </h2>
          <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
            {locale === "sw"
              ? "Mauzo, bidhaa, stock, marejesho na fedha za biashara."
              : "Sales, items, stock, returns and business finance."}
          </p>
        </div>

        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 sm:gap-3 lg:grid-cols-4 2xl:grid-cols-5">
          {commerceItems.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                className="group relative flex min-h-28 min-w-0 flex-col overflow-hidden rounded-lg border border-slate-200 bg-white p-3 shadow-[0_2px_8px_rgba(15,23,42,0.04)] transition-[transform,box-shadow,border-color] hover:-translate-y-0.5 hover:border-brand-navy/25 hover:shadow-[0_8px_20px_rgba(15,23,42,0.08)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-navy/30 dark:border-slate-800 dark:bg-slate-950 sm:min-h-30 sm:p-3.5"
                href={item.href}
                key={item.href}
              >
                <span
                  aria-hidden="true"
                  className="absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r from-brand-navy to-brand-orange opacity-70"
                />
                <span className="inline-flex size-8 shrink-0 items-center justify-center rounded-md bg-brand-navy-soft text-brand-navy transition-transform group-hover:scale-105 dark:bg-brand-navy/20 dark:text-brand-orange sm:size-9">
                  <Icon className="size-4 sm:size-4.5" />
                </span>
                <h3 className="mt-2.5 line-clamp-2 text-xs font-semibold leading-4 text-slate-950 dark:text-white sm:text-sm sm:leading-5">
                  {item.title}
                </h3>
                <span className="mt-auto inline-flex items-center gap-1 pt-2 text-[11px] font-semibold text-brand-navy group-hover:text-brand-orange dark:text-brand-orange sm:text-xs">
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
