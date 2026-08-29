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
  description: string;
  href: string;
  icon: LucideIcon;
  title: string;
};

function WorkspaceCapabilityDirectory({ businessId }: { businessId: string }) {
  const locale = useLocale();

  const commerceItems: ToolItem[] = [
    {
      description:
        locale === "sw"
          ? "Muhtasari wa mauzo, stock, marejesho, gharama na bajeti."
          : "An overall view of sales, stock, returns, expenses and budgets.",
      href: `/workspace/${businessId}/commerce`,
      icon: LayoutDashboard,
      title: locale === "sw" ? "Muhtasari wa biashara" : "Business Overview",
    },
    {
      description:
        locale === "sw"
          ? "Bidhaa na vitu ambavyo biashara yako inauza."
          : "Products and items your business has available to sell.",
      href: `/workspace/${businessId}/commerce/products`,
      icon: Store,
      title: locale === "sw" ? "Bidhaa" : "Available items",
    },
    {
      description:
        locale === "sw"
          ? "Fuatilia kiasi cha stock na mapokezi ya bidhaa."
          : "Track stock levels and incoming inventory.",
      href: `/workspace/${businessId}/commerce/inventory`,
      icon: Building2,
      title: "Stock",
    },
    {
      description:
        locale === "sw"
          ? "Rekodi na ufuatilie mauzo ya biashara yako."
          : "Record and track the sales your business makes.",
      href: `/workspace/${businessId}/commerce/sales`,
      icon: ShoppingBag,
      title: locale === "sw" ? "Mauzo" : "Sales",
    },
    {
      description:
        locale === "sw"
          ? "Simamia marejesho ya bidhaa baada ya mauzo."
          : "Manage product returns after a sale.",
      href: `/workspace/${businessId}/commerce/returns`,
      icon: Inbox,
      title: locale === "sw" ? "Marejesho" : "Returns",
    },
    {
      description:
        locale === "sw"
          ? "Rekodi gharama za kila siku za biashara."
          : "Record the everyday costs of running the business.",
      href: `/workspace/${businessId}/commerce/expenses`,
      icon: Settings2,
      title: locale === "sw" ? "Gharama" : "Expenses",
    },
    {
      description:
        locale === "sw"
          ? "Panga matumizi na ulinganishe na matumizi halisi."
          : "Plan spending and compare it with actual costs.",
      href: `/workspace/${businessId}/commerce/budgets`,
      icon: ShieldCheck,
      title: locale === "sw" ? "Bajeti" : "Budgets",
    },
  ];

  return (
    <div>
      <header className="mb-6 sm:mb-7">
        <p className="max-w-2xl text-sm text-slate-600 dark:text-slate-300">
          {locale === "sw"
            ? "Fungua sehemu ya biashara unayohitaji kuanza kufanya kazi."
            : "Open the business area you need to start working."}
        </p>
      </header>

      <section aria-labelledby="commerce-tools-title">
        <div className="mb-4 sm:mb-5">
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

        <div className="grid grid-cols-2 gap-x-3 gap-y-3 sm:grid-cols-3 sm:gap-x-5 sm:gap-y-5 lg:grid-cols-3 lg:gap-x-6 lg:gap-y-6">
          {commerceItems.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                className="group relative flex min-h-24 min-w-0 flex-col overflow-hidden rounded-lg border border-slate-200 bg-white p-2.5 shadow-[0_2px_8px_rgba(15,23,42,0.04)] transition-[transform,box-shadow,border-color] hover:-translate-y-0.5 hover:border-brand-navy/25 hover:shadow-[0_8px_20px_rgba(15,23,42,0.08)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-navy/30 dark:border-slate-800 dark:bg-slate-950 sm:min-h-32 sm:p-4"
                href={item.href}
                key={item.href}
              >
                <span
                  aria-hidden="true"
                  className="absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r from-brand-navy to-brand-orange opacity-70"
                />

                <span className="flex min-w-0 items-start gap-2.5 sm:gap-3">
                  <span className="inline-flex size-7 shrink-0 items-center justify-center rounded-md bg-brand-navy-soft text-brand-navy transition-transform group-hover:scale-105 dark:bg-brand-navy/20 dark:text-brand-orange sm:size-9">
                    <Icon className="size-3.5 sm:size-4.5" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <h3 className="line-clamp-1 text-[11px] font-semibold leading-4 text-slate-950 dark:text-white sm:text-sm sm:leading-5">
                      {item.title}
                    </h3>
                    <span className="mt-0.5 line-clamp-2 block text-[10px] leading-3.5 text-slate-500 dark:text-slate-400 sm:mt-1 sm:text-xs sm:leading-4">
                      {item.description}
                    </span>
                  </span>
                </span>

                <span className="mt-auto inline-flex items-center gap-1 pt-2 text-[10px] font-semibold text-brand-navy group-hover:text-brand-orange dark:text-brand-orange sm:pt-3 sm:text-xs">
                  {locale === "sw" ? "Tazama" : "View"}
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
