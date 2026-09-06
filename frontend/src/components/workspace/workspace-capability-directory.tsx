"use client";

import { useLocale } from "next-intl";
import type { ComponentType } from "react";

import { Link } from "@/i18n/navigation";

type IconComponent = ComponentType<{ className?: string }>;

type ToolItem = {
  description: string;
  href: string;
  icon: IconComponent;
  title: string;
};

/**
 * Custom faceted logomark icons.
 * Each icon is built from two or three flat color facets (rather than a
 * single-tone outline glyph) so the grid reads as a set of small brand
 * marks, the same way a directory of distinct apps would.
 */

function OverviewIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 40 40">
      <rect x="5" y="21" width="8" height="14" rx="2" fill="#4338CA" />
      <rect x="16" y="13" width="8" height="22" rx="2" fill="#7C3AED" />
      <rect x="27" y="5" width="8" height="30" rx="2" fill="#A78BFA" />
    </svg>
  );
}

function ProductsIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 40 40">
      <path d="M20 3 L35 11.5 V28.5 L20 37 L5 28.5 V11.5 Z" fill="#EA580C" />
      <path d="M20 3 L35 11.5 L20 20 L5 11.5 Z" fill="#FBBF24" />
    </svg>
  );
}

function StockIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 40 40">
      <rect x="6" y="6" width="28" height="7" rx="2.5" fill="#047857" />
      <rect x="6" y="16.5" width="28" height="7" rx="2.5" fill="#14B8A6" />
      <rect x="6" y="27" width="28" height="7" rx="2.5" fill="#5EEAD4" />
    </svg>
  );
}

function SalesIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 40 40">
      <path
        d="M5 30 L15.5 19.5 L22 26 L30 18"
        stroke="#F59E0B"
        strokeWidth="5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="32.5" cy="9.5" r="6.5" fill="#EA580C" />
      <path
        d="M28 9.5 h9 M32.5 5 v9"
        stroke="#FFF7ED"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

function ReturnsIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 40 40">
      <path
        d="M8 21a12 12 0 0 1 20.5-8.5"
        stroke="#4F46E5"
        strokeWidth="5"
        strokeLinecap="round"
      />
      <path d="M29 5.5 L32.5 12.5 L24 13.5 Z" fill="#4F46E5" />
      <path
        d="M32 19a12 12 0 0 1-20.5 8.5"
        stroke="#38BDF8"
        strokeWidth="5"
        strokeLinecap="round"
      />
      <path d="M11 34.5 L7.5 27.5 L16 26.5 Z" fill="#38BDF8" />
    </svg>
  );
}

function ExpensesIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 40 40">
      <path d="M20 4a16 16 0 1 1 0 32 16 16 0 0 1 0-32Z" fill="#E11D48" />
      <path
        d="M20 4a16 16 0 0 1 13.86 24"
        stroke="#FB7185"
        strokeWidth="4"
        strokeLinecap="round"
        fill="none"
      />
      <path
        d="M15 25c0 2.8 2.5 4.5 5 4.5s5-1.6 5-3.6-2-2.9-5-3.7-5-1.7-5-3.7 2.5-3.6 5-3.6 5 1.7 5 4.2"
        stroke="#FFF1F2"
        strokeWidth="2.3"
        strokeLinecap="round"
        fill="none"
      />
    </svg>
  );
}

function BudgetsIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 40 40">
      <path d="M20 4 L34 9.5 V19c0 10-6 16-14 17-8-1-14-7-14-17V9.5Z" fill="#0891B2" />
      <path d="M20 4 L34 9.5 V19c0 10-6 16-14 17V4Z" fill="#2563EB" />
      <path
        d="M14 20.5 L18.5 25 L27 15.5"
        stroke="#F0F9FF"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </svg>
  );
}

function WorkspaceCapabilityDirectory({ businessId }: { businessId: string }) {
  const locale = useLocale();

  const commerceItems: ToolItem[] = [
    {
      description:
        locale === "sw"
          ? "Muhtasari wa mauzo, stock, marejesho, gharama na bajeti."
          : "An overall view of sales, stock, returns, expenses and budgets.",
      href: `/workspace/${businessId}/commerce`,
      icon: OverviewIcon,
      title: locale === "sw" ? "Muhtasari wa biashara" : "Business Overview",
    },
    {
      description:
        locale === "sw"
          ? "Bidhaa na vitu ambavyo biashara yako inauza."
          : "Products your business currently has available to sell.",
      href: `/workspace/${businessId}/commerce/products`,
      icon: ProductsIcon,
      title: locale === "sw" ? "Bidhaa zilizopo" : "Available Products",
    },
    {
      description:
        locale === "sw"
          ? "Fuatilia kiasi cha stock na mapokezi ya bidhaa."
          : "Track stock levels and incoming inventory.",
      href: `/workspace/${businessId}/commerce/inventory`,
      icon: StockIcon,
      title: "Stock",
    },
    {
      description:
        locale === "sw"
          ? "Rekodi na ufuatilie mauzo ya biashara yako."
          : "Record and track the sales your business makes.",
      href: `/workspace/${businessId}/commerce/sales`,
      icon: SalesIcon,
      title: locale === "sw" ? "Mauzo" : "Sales",
    },
    {
      description:
        locale === "sw"
          ? "Simamia marejesho ya bidhaa baada ya mauzo."
          : "Manage product returns after a sale.",
      href: `/workspace/${businessId}/commerce/returns`,
      icon: ReturnsIcon,
      title: locale === "sw" ? "Marejesho" : "Returns",
    },
    {
      description:
        locale === "sw"
          ? "Rekodi gharama za kila siku za biashara."
          : "Record the everyday costs of running the business.",
      href: `/workspace/${businessId}/commerce/expenses`,
      icon: ExpensesIcon,
      title: locale === "sw" ? "Gharama" : "Expenses",
    },
    {
      description:
        locale === "sw"
          ? "Panga matumizi na ulinganishe na matumizi halisi."
          : "Plan spending and compare it with actual costs.",
      href: `/workspace/${businessId}/commerce/budgets`,
      icon: BudgetsIcon,
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
              : "Sales, products, stock, returns and business finance."}
          </p>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-3">
          {commerceItems.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                className="group flex items-center gap-3.5 rounded-xl border border-slate-200 bg-white p-3.5 shadow-[0_1px_2px_rgba(15,23,42,0.04)] transition-colors hover:border-slate-300 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-navy/30 dark:border-slate-800 dark:bg-slate-950 dark:hover:border-slate-700 dark:hover:bg-slate-900 sm:gap-4 sm:p-4"
                href={item.href}
                key={item.href}
                title={item.description}
              >
                <Icon className="size-9 shrink-0 sm:size-10" />
                <span className="min-w-0 flex-1">
                  <h3 className="truncate text-sm font-semibold text-slate-950 dark:text-white">
                    {item.title}
                  </h3>
                  <span className="sr-only">{item.description}</span>
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
