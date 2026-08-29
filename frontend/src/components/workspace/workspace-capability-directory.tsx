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
import { useWorkspace } from "@/providers/workspace/workspace-provider";

type DirectoryItem = {
  description: string;
  href: string;
  icon: LucideIcon;
  title: string;
};

function WorkspaceCapabilityDirectory({ businessId }: { businessId: string }) {
  const locale = useLocale();
  const { businesses } = useWorkspace();
  const business = businesses.find((item) => item.id === businessId);
  const commerceEnabled = Boolean(
    business?.capabilities.includes("business_operations") &&
      business.membership.permissions.includes("commerce.view"),
  );

  const brandedTextStyle = {
    color: "var(--workspace-primary, var(--brand-navy))",
  } as CSSProperties;
  const brandedIconStyle = {
    backgroundColor:
      "color-mix(in srgb, var(--workspace-primary, var(--brand-navy)) 10%, white)",
    color: "var(--workspace-primary, var(--brand-navy))",
  } as CSSProperties;

  const commerceItems: DirectoryItem[] = [
    {
      description:
        locale === "sw"
          ? "Angalia hali ya biashara na viashiria muhimu vya Commerce."
          : "See your business pulse and the key signals from Commerce.",
      href: `/workspace/${businessId}/commerce`,
      icon: LayoutDashboard,
      title: locale === "sw" ? "Hali ya biashara" : "Business Pulse",
    },
    {
      description:
        locale === "sw"
          ? "Dhibiti bidhaa na vitu ambavyo biashara yako inauza."
          : "Manage the products and items your business has available to sell.",
      href: `/workspace/${businessId}/commerce/products`,
      icon: Store,
      title: locale === "sw" ? "Bidhaa zinazopatikana" : "Available items",
    },
    {
      description:
        locale === "sw"
          ? "Fuatilia stock, mapokezi na kiasi kilichopo."
          : "Track stock, receipts and the quantities currently available.",
      href: `/workspace/${businessId}/commerce/inventory`,
      icon: Building2,
      title: "Stock",
    },
    {
      description:
        locale === "sw"
          ? "Rekodi mauzo na fuatilia miamala ya biashara."
          : "Record sales and follow the transactions your business makes.",
      href: `/workspace/${businessId}/commerce/sales`,
      icon: ShoppingBag,
      title: locale === "sw" ? "Mauzo" : "Sales",
    },
    {
      description:
        locale === "sw"
          ? "Shughulikia marejesho ya baada ya mauzo na matokeo yake."
          : "Handle post-sale returns and their inventory and refund outcomes.",
      href: `/workspace/${businessId}/commerce/returns`,
      icon: Inbox,
      title: locale === "sw" ? "Marejesho" : "Returns",
    },
    {
      description:
        locale === "sw"
          ? "Rekodi gharama za kila siku za kuendesha biashara."
          : "Record the day-to-day operating costs of the business.",
      href: `/workspace/${businessId}/commerce/expenses`,
      icon: Settings2,
      title: locale === "sw" ? "Gharama" : "Expenses",
    },
    {
      description:
        locale === "sw"
          ? "Panga matumizi na linganisha mpango na matumizi halisi."
          : "Plan spending and compare your budget with what actually happened.",
      href: `/workspace/${businessId}/commerce/budgets`,
      icon: ShieldCheck,
      title: locale === "sw" ? "Bajeti" : "Budgets",
    },
  ];

  return (
    <div className="space-y-5">
      <header>
        <h1 className="text-xl font-semibold tracking-tight text-slate-950 dark:text-white sm:text-2xl">
          {locale === "sw" ? "Orodha" : "Directory"}
        </h1>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
          {locale === "sw"
            ? "Chagua sehemu unayotaka kuanza kufanya kazi."
            : "Choose where you want to start working."}
        </p>
      </header>

      {commerceEnabled ? (
        <section className="overflow-hidden rounded-lg border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950">
          <div className="border-b border-slate-200 px-4 py-4 dark:border-slate-800 sm:px-5">
            <h2 className="text-base font-semibold text-slate-950 dark:text-white">
              {locale === "sw" ? "Biashara" : "Commerce"}
            </h2>
            <p className="mt-1 text-xs leading-5 text-slate-500 dark:text-slate-400">
              {locale === "sw"
                ? "Mauzo, bidhaa, stock, marejesho na matumizi ya biashara."
                : "Sales, items, stock, returns and business spending."}
            </p>
          </div>

          <div className="grid gap-3 p-4 sm:grid-cols-2 sm:p-5 xl:grid-cols-3">
            {commerceItems.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  className="group flex min-h-48 flex-col rounded-lg border border-slate-200 bg-white p-4 transition-colors hover:bg-interactive-highlight focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400/40 dark:border-slate-800 dark:bg-slate-950 dark:hover:bg-slate-900"
                  href={item.href}
                  key={item.href}
                >
                  <span
                    className="inline-flex size-10 items-center justify-center rounded-lg"
                    style={brandedIconStyle}
                  >
                    <Icon className="size-5" />
                  </span>
                  <h3 className="mt-4 text-sm font-semibold text-slate-950 dark:text-white">
                    {item.title}
                  </h3>
                  <p className="mt-2 text-sm leading-5 text-slate-600 dark:text-slate-300">
                    {item.description}
                  </p>
                  <span
                    className="mt-auto inline-flex items-center gap-1 pt-5 text-sm font-semibold group-hover:opacity-75"
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
      ) : (
        <section className="rounded-lg border border-slate-200 bg-white p-5 text-sm text-slate-600 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-300">
          {locale === "sw"
            ? "Hakuna sehemu za biashara zinazopatikana kwa akaunti hii kwa sasa."
            : "There are no business areas available to this account yet."}
        </section>
      )}
    </div>
  );
}

export { WorkspaceCapabilityDirectory };
