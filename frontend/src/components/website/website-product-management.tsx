"use client";

import { FileText, Grid2X2, Package2 } from "lucide-react";
import { useState } from "react";

import { WebsiteHomepageCategoriesManager } from "@/components/website/website-homepage-categories-manager";
import { WebsiteProductCategoryAssignment } from "@/components/website/website-product-category-assignment";
import { WebsiteProductManager } from "@/components/website/website-product-manager";
import { WebsiteProductPageContentManager } from "@/components/website/website-product-page-content-manager";

type WebsiteProductManagementProps = {
  businessId: string;
  locale: string;
};

type ProductManagementSection = "products" | "content" | "categories";

function WebsiteProductManagement({ businessId, locale }: WebsiteProductManagementProps) {
  const sw = locale === "sw";
  const [activeSection, setActiveSection] = useState<ProductManagementSection>("products");
  const tabs = [
    {
      id: "products" as const,
      icon: Package2,
      label: sw ? "Bidhaa" : "Products",
    },
    {
      id: "content" as const,
      icon: FileText,
      label: sw ? "Kurasa za bidhaa" : "Product pages",
    },
    {
      id: "categories" as const,
      icon: Grid2X2,
      label: sw ? "Makundi" : "Categories",
    },
  ];

  return (
    <div className="min-w-0 space-y-5">
      <section className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-950 sm:p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl">
            <p className="text-xs font-medium uppercase tracking-[0.12em] text-slate-400">Website</p>
            <h1 className="mt-1 text-2xl font-medium text-slate-950 dark:text-white">
              {sw ? "Usimamizi wa bidhaa" : "Product management"}
            </h1>
            <p className="mt-2 text-sm leading-6 text-slate-500 dark:text-slate-400">
              {sw
                ? "Simamia bidhaa, maudhui ya kurasa za bidhaa na makundi ya storefront mahali pamoja. Makundi yanabaki hiari na bidhaa zinaweza kuwekwa kwenye kundi moja au zaidi."
                : "Manage Website products, rich product-page content, and storefront categories in one place. Categories remain optional, and products can be organized into one or more categories."}
            </p>
          </div>

          <div
            aria-label={sw ? "Sehemu za usimamizi wa bidhaa" : "Product management sections"}
            className="inline-flex w-full rounded-lg bg-slate-100 p-1 dark:bg-slate-900 sm:w-auto"
            role="tablist"
          >
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const selected = activeSection === tab.id;
              return (
                <button
                  aria-controls={`product-management-${tab.id}-panel`}
                  aria-selected={selected}
                  className={`inline-flex min-h-9 flex-1 items-center justify-center gap-2 rounded-md px-3 text-sm font-medium transition sm:flex-none ${
                    selected
                      ? "bg-white text-sky-700 shadow-sm ring-1 ring-sky-100 dark:bg-slate-950 dark:text-sky-300 dark:ring-sky-900/60"
                      : "text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
                  }`}
                  id={`product-management-${tab.id}-tab`}
                  key={tab.id}
                  onClick={() => setActiveSection(tab.id)}
                  role="tab"
                  type="button"
                >
                  <Icon className="size-4" />
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>
      </section>

      <div
        aria-labelledby={`product-management-${activeSection}-tab`}
        id={`product-management-${activeSection}-panel`}
        role="tabpanel"
      >
        {activeSection === "products" ? (
          <div className="space-y-5">
            <WebsiteProductCategoryAssignment businessId={businessId} locale={locale} />
            <WebsiteProductManager businessId={businessId} />
          </div>
        ) : activeSection === "content" ? (
          <WebsiteProductPageContentManager businessId={businessId} locale={locale} />
        ) : (
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950">
            <WebsiteHomepageCategoriesManager businessId={businessId} locale={locale} />
          </div>
        )}
      </div>
    </div>
  );
}

export { WebsiteProductManagement };