"use client";

import { useParams } from "next/navigation";
import { useEffect, useState } from "react";

import { useWebsiteRequest } from "@/hooks/website/use-website-request";
import { getWebsiteSites } from "@/services/website/website";
import type {
  WebsiteListing,
  WebsiteNavigationSection,
  WebsiteNavigationTarget,
} from "@/types/website/website";

type WebsiteNavigationDestinationFieldProps = {
  disabled?: boolean;
  listings: WebsiteListing[];
  locale: string;
  onChange: (target: WebsiteNavigationTarget) => void;
  value: WebsiteNavigationTarget;
};

type NavigationCategory = {
  id: string;
  title: {
    en: string;
    sw: string;
  };
};

type NavigationCategoryState = {
  businessId: string;
  categories: NavigationCategory[];
  failed: boolean;
};

const SECTIONS: Array<{
  value: WebsiteNavigationSection;
  en: string;
  sw: string;
}> = [
  { value: "hero", en: "Hero", sw: "Hero" },
  { value: "popular", en: "Popular picks", sw: "Chaguo maarufu" },
  { value: "services", en: "Services", sw: "Huduma" },
  { value: "footer", en: "Footer", sw: "Sehemu ya chini" },
];

const categoryRequestCache = new Map<string, Promise<NavigationCategory[]>>();

function objectValue(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
}

function normalizeCategories(value: unknown): NavigationCategory[] {
  const source = objectValue(value);
  if (source.enabled === false || !Array.isArray(source.items)) return [];

  return source.items.flatMap((value) => {
    const item = objectValue(value);
    const id = typeof item.id === "string" ? item.id.trim() : "";
    if (!id) return [];
    const title = objectValue(item.title);
    return [{
      id,
      title: {
        en: typeof title.en === "string" ? title.en : "",
        sw: typeof title.sw === "string" ? title.sw : "",
      },
    }];
  });
}

function categoryHref(id: string) {
  return `/products?category=${encodeURIComponent(id)}`;
}

function categoryIdFromHref(href: string) {
  const trimmed = href.trim();
  if (!trimmed.startsWith("/products?")) return null;
  const query = trimmed.slice(trimmed.indexOf("?") + 1).split("#", 1)[0];
  const id = new URLSearchParams(query).get("category")?.trim() ?? "";
  return id || null;
}

function categoryLabel(category: NavigationCategory, locale: string) {
  return category.title[locale as "en" | "sw"] || category.title.en || category.title.sw || category.id;
}

function listingLabel(listing: WebsiteListing, locale: string) {
  const title =
    listing.title[locale] || listing.title.en || listing.title.sw || listing.slug;
  const connected = listing.variants.some((variant) => variant.commerce_product_id);
  const source = connected
    ? locale === "sw"
      ? "Imeunganishwa na Commerce"
      : "Commerce connected"
    : locale === "sw"
      ? "Bidhaa ya Website"
      : "Website product";
  const variants =
    locale === "sw"
      ? `${listing.variants.length} aina`
      : `${listing.variants.length} variant${listing.variants.length === 1 ? "" : "s"}`;
  return `${title} · ${variants} · ${source}`;
}

function WebsiteNavigationDestinationField({
  disabled = false,
  listings,
  locale,
  onChange,
  value,
}: WebsiteNavigationDestinationFieldProps) {
  const sw = locale === "sw";
  const request = useWebsiteRequest();
  const params = useParams<{ businessId?: string | string[] }>();
  const routeBusinessId = params.businessId;
  const businessId = Array.isArray(routeBusinessId)
    ? routeBusinessId[0] ?? ""
    : routeBusinessId ?? "";
  const [categoryState, setCategoryState] = useState<NavigationCategoryState>({
    businessId: "",
    categories: [],
    failed: false,
  });
  const categories = categoryState.businessId === businessId
    ? categoryState.categories
    : [];
  const categoriesFailed = categoryState.businessId === businessId
    ? categoryState.failed
    : false;
  const categoriesLoading = Boolean(businessId) && categoryState.businessId !== businessId;
  const selectedCategoryId = value.type === "legacy"
    ? categoryIdFromHref(value.href)
    : null;
  const selectedCategory = selectedCategoryId
    ? categories.find((category) => category.id === selectedCategoryId)
    : undefined;
  const destinationType = selectedCategoryId ? "category" : value.type;

  useEffect(() => {
    if (!businessId) return;

    let cancelled = false;

    let pending = categoryRequestCache.get(businessId);
    if (!pending) {
      pending = request((token) => getWebsiteSites(businessId, token))
        .then((response) => normalizeCategories(response.data?.sites[0]?.categories))
        .finally(() => categoryRequestCache.delete(businessId));
      categoryRequestCache.set(businessId, pending);
    }

    void pending
      .then((nextCategories) => {
        if (!cancelled) {
          setCategoryState({
            businessId,
            categories: nextCategories,
            failed: false,
          });
        }
      })
      .catch(() => {
        if (!cancelled) {
          setCategoryState({
            businessId,
            categories: [],
            failed: true,
          });
        }
      });

    return () => {
      cancelled = true;
    };
  }, [businessId, request]);

  return (
    <div className="grid min-w-0 gap-2">
      <label className="grid min-w-0 gap-1 text-xs font-medium text-slate-600 dark:text-slate-300">
        {sw ? "Unganisha na" : "Link to"}
        <select
          className="h-9 min-w-0 w-full rounded-md border border-slate-300 bg-white px-2.5 text-sm text-slate-900 outline-none focus:border-slate-500 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
          disabled={disabled}
          onChange={(event) => {
            const type = event.target.value;
            if (type === "home") onChange({ type: "home" });
            if (type === "shop") onChange({ type: "shop" });
            if (type === "category") {
              const categoryId = categories[0]?.id;
              if (categoryId) onChange({ type: "legacy", href: categoryHref(categoryId) });
            }
            if (type === "product")
              onChange({ type: "product", id: listings[0]?.id ?? "" });
            if (type === "section")
              onChange({ type: "section", section: "hero" });
            if (type === "external")
              onChange({ type: "external", url: "https://" });
          }}
          value={destinationType}
        >
          <option value="home">{sw ? "Ukurasa wa mwanzo" : "Home"}</option>
          <option value="shop">{sw ? "Duka / Bidhaa zote" : "Shop / All products"}</option>
          <option
            disabled={categoriesLoading || (categories.length === 0 && !selectedCategoryId)}
            value="category"
          >
            {sw ? "Kundi la bidhaa" : "Product category"}
          </option>
          <option value="product">{sw ? "Bidhaa ya Website" : "Website product"}</option>
          <option value="section">{sw ? "Sehemu ya homepage" : "Homepage section"}</option>
          <option value="external">{sw ? "Tovuti ya nje" : "External website"}</option>
          {value.type === "legacy" && !selectedCategoryId ? (
            <option value="legacy">{sw ? "Kiungo cha zamani" : "Existing custom link"}</option>
          ) : null}
        </select>
      </label>

      {selectedCategoryId ? (
        <label className="grid min-w-0 gap-1 text-[11px] font-medium text-slate-600 dark:text-slate-300">
          {sw ? "Chagua kundi" : "Choose category"}
          <select
            className="h-9 min-w-0 w-full rounded-md border border-slate-300 bg-white px-2.5 text-sm text-slate-900 outline-none focus:border-slate-500 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
            disabled={disabled || categoriesLoading || categories.length === 0}
            onChange={(event) =>
              onChange({ type: "legacy", href: categoryHref(event.target.value) })
            }
            value={selectedCategoryId}
          >
            {!selectedCategory ? (
              <option value={selectedCategoryId}>
                {categoriesLoading
                  ? (sw ? "Inapakia kundi..." : "Loading category...")
                  : categoriesFailed
                    ? (sw ? "Kundi halijathibitishwa" : "Category could not be verified")
                    : (sw ? "Kundi halipatikani" : "Category unavailable")}
              </option>
            ) : null}
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {categoryLabel(category, locale)}
              </option>
            ))}
          </select>
          <span className="font-normal leading-4 text-slate-400">
            {sw
              ? "Makundi huundwa na kusimamiwa kwenye Product Management. Kuchagua kundi hapa hubadilisha kiungo hiki cha navigation pekee."
              : "Categories are created and managed in Product Management. Choosing one here only changes this navigation link."}
          </span>
          {!categoriesLoading && !categoriesFailed && !selectedCategory ? (
            <span className="font-normal leading-4 text-amber-600 dark:text-amber-400">
              {sw
                ? "Kundi lililohusishwa halipatikani tena. Chagua kundi linalopatikana au destination nyingine."
                : "The linked category is no longer available. Choose an available category or another destination."}
            </span>
          ) : null}
        </label>
      ) : null}

      {destinationType === "category" && !selectedCategoryId ? (
        <div className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-[11px] leading-5 text-slate-500 dark:border-slate-800 dark:bg-slate-900/50 dark:text-slate-400">
          {categoriesLoading
            ? (sw ? "Inapakia makundi ya bidhaa..." : "Loading product categories...")
            : categoriesFailed
              ? (sw ? "Makundi hayajapakiwa. Jaribu tena baada ya kupakia ukurasa upya." : "Categories could not be loaded. Try again after refreshing the page.")
              : (sw ? "Unda kundi kwanza kwenye Product Management → Categories." : "Create a category first in Product Management → Categories.")}
        </div>
      ) : null}

      {value.type === "product" ? (
        <label className="grid min-w-0 gap-1 text-[11px] font-medium text-slate-600 dark:text-slate-300">
          {sw ? "Chagua bidhaa" : "Choose product"}
          <select
            className="h-9 min-w-0 w-full rounded-md border border-slate-300 bg-white px-2.5 text-sm text-slate-900 outline-none focus:border-slate-500 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
            disabled={disabled || listings.length === 0}
            onChange={(event) =>
              onChange({ type: "product", id: event.target.value })
            }
            value={value.id}
          >
            {listings.length === 0 ? (
              <option value="">
                {sw ? "Hakuna bidhaa za Website bado" : "No Website products yet"}
              </option>
            ) : null}
            {listings.map((listing) => (
              <option key={listing.id} value={listing.id}>
                {listingLabel(listing, locale)}
              </option>
            ))}
          </select>
          <span className="font-normal leading-4 text-slate-400">
            {sw
              ? "Bidhaa za standalone na Commerce-connected zinaonekana hapa kwa njia ile ile."
              : "Standalone and Commerce-connected products appear here the same way."}
          </span>
        </label>
      ) : null}

      {value.type === "section" ? (
        <label className="grid min-w-0 gap-1 text-[11px] font-medium text-slate-600 dark:text-slate-300">
          {sw ? "Chagua sehemu" : "Choose section"}
          <select
            className="h-9 min-w-0 w-full rounded-md border border-slate-300 bg-white px-2.5 text-sm text-slate-900 outline-none focus:border-slate-500 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
            disabled={disabled}
            onChange={(event) =>
              onChange({
                type: "section",
                section: event.target.value as WebsiteNavigationSection,
              })
            }
            value={value.section}
          >
            {SECTIONS.map((section) => (
              <option key={section.value} value={section.value}>
                {sw ? section.sw : section.en}
              </option>
            ))}
          </select>
        </label>
      ) : null}

      {value.type === "external" ? (
        <label className="grid min-w-0 gap-1 text-[11px] font-medium text-slate-600 dark:text-slate-300">
          {sw ? "Anwani ya tovuti" : "Website URL"}
          <input
            className="h-9 min-w-0 w-full rounded-md border border-slate-300 bg-white px-2.5 font-mono text-xs text-slate-900 outline-none focus:border-slate-500 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
            disabled={disabled}
            onChange={(event) =>
              onChange({ type: "external", url: event.target.value })
            }
            placeholder="https://example.com"
            type="url"
            value={value.url}
          />
        </label>
      ) : null}

      {value.type === "legacy" && !selectedCategoryId ? (
        <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-[11px] leading-5 text-amber-800 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-200">
          <span className="block font-semibold">
            {sw ? "Kiungo cha zamani" : "Existing custom link"}
          </span>
          <span className="break-all font-mono">{value.href}</span>
          <span className="mt-1 block font-sans text-amber-700/80 dark:text-amber-300/80">
            {sw
              ? "Kiungo hiki kitaendelea kufanya kazi. Chagua aina nyingine hapo juu ili Tunakuza kisimamie kiotomatiki."
              : "This link will keep working. Choose another destination type above to let Tunakuza manage it automatically."}
          </span>
        </div>
      ) : null}
    </div>
  );
}

export { WebsiteNavigationDestinationField };
