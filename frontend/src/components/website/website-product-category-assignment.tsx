"use client";

import { Check, FolderPlus, Loader2, Plus, X } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";

import { Button } from "@/components/global/primitives/button";
import { useWebsiteRequest } from "@/hooks/website/use-website-request";
import { useNotification } from "@/providers/global/notification-provider";
import { useWorkspace } from "@/providers/workspace/workspace-provider";
import { getWebsiteListings, getWebsiteSites, updateWebsiteSite } from "@/services/website/website";
import type { WebsiteListing, WebsiteSite } from "@/types/website/website";

type Props = {
  businessId: string;
  locale: string;
};

type LocalizedValue = {
  en: string;
  sw: string;
};

type CategoryItem = {
  id: string;
  title: LocalizedValue;
  listingIds: string[];
  familyIds: string[];
  raw: Record<string, unknown>;
};

type CategoriesState = {
  enabled: boolean;
  title: LocalizedValue;
  items: CategoryItem[];
  raw: Record<string, unknown>;
};

const MAX_CATEGORIES = 10;
const inputClassName =
  "h-9 w-full rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-900 outline-none focus:border-slate-500 dark:border-slate-700 dark:bg-slate-950 dark:text-white";

function objectValue(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
}

function localizedValue(value: unknown, fallback: LocalizedValue = { en: "", sw: "" }): LocalizedValue {
  const source = objectValue(value);
  return {
    en: typeof source.en === "string" ? source.en : fallback.en,
    sw: typeof source.sw === "string" ? source.sw : fallback.sw,
  };
}

function stringList(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return [...new Set(
    value
      .filter((item): item is string => typeof item === "string" && Boolean(item.trim()))
      .map((item) => item.trim()),
  )];
}

function normalizeCategories(value: unknown): CategoriesState {
  const source = objectValue(value);
  const items = Array.isArray(source.items)
    ? source.items.flatMap((value, index) => {
        const raw = objectValue(value);
        if (!Object.keys(raw).length) return [];
        return [{
          id: typeof raw.id === "string" && raw.id ? raw.id : `category-${index + 1}`,
          title: localizedValue(raw.title),
          listingIds: stringList(raw.listingIds),
          familyIds: stringList(raw.familyIds),
          raw,
        }];
      })
    : [];

  return {
    enabled: source.enabled !== false,
    title: localizedValue(source.title, { en: "Products", sw: "Bidhaa" }),
    items,
    raw: source,
  };
}

function categoriesPayload(categories: CategoriesState) {
  return {
    ...categories.raw,
    enabled: categories.enabled,
    title: categories.title,
    items: categories.items.map((item) => ({
      ...item.raw,
      id: item.id,
      source: typeof item.raw.source === "string" ? item.raw.source : "catalog",
      listingIds: item.listingIds,
      familyIds: item.familyIds,
      title: item.title,
      href: `/products?category=${encodeURIComponent(item.id)}`,
    })),
  };
}

function listingTitle(listing: WebsiteListing, sw: boolean) {
  return listing.title[sw ? "sw" : "en"] || listing.title.en || listing.title.sw || listing.slug;
}

function categoryTitle(category: CategoryItem, sw: boolean) {
  return category.title[sw ? "sw" : "en"] || category.title.en || category.title.sw || category.id;
}

function categoryId(title: string) {
  const base = title
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || "category";
  return `${base}-${Date.now().toString(36)}`;
}

export function WebsiteProductCategoryAssignment({ businessId, locale }: Props) {
  const sw = locale === "sw";
  const request = useWebsiteRequest();
  const { notify } = useNotification();
  const { businesses, status: workspaceStatus } = useWorkspace();
  const business = businesses.find((item) => item.id === businessId);
  const canManage = Boolean(business?.membership.permissions.includes("website.manage"));
  const [site, setSite] = useState<WebsiteSite | null>(null);
  const [listings, setListings] = useState<WebsiteListing[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [openListingId, setOpenListingId] = useState<string | null>(null);
  const [savingListingId, setSavingListingId] = useState<string | null>(null);
  const [creatingForListingId, setCreatingForListingId] = useState<string | null>(null);
  const [newTitleEn, setNewTitleEn] = useState("");
  const [newTitleSw, setNewTitleSw] = useState("");
  const categories = useMemo(() => normalizeCategories(site?.categories), [site]);

  const load = useCallback(async (signal?: AbortSignal) => {
    if (workspaceStatus !== "ready") return;
    setLoading(true);
    setError(null);
    try {
      const sitesResponse = await request((token) => getWebsiteSites(businessId, token, signal));
      const activeSite = sitesResponse.data?.sites[0] ?? null;
      setSite(activeSite);
      if (!activeSite) {
        setListings([]);
        return;
      }
      const listingsResponse = await request((token) => getWebsiteListings(businessId, activeSite.id, token, signal));
      setListings(listingsResponse.data?.listings ?? []);
    } catch (loadError) {
      if (signal?.aborted) return;
      setError(loadError instanceof Error
        ? loadError.message
        : sw ? "Makundi ya bidhaa hayajapakiwa." : "Product categories could not be loaded.");
    } finally {
      if (!signal?.aborted) setLoading(false);
    }
  }, [businessId, request, sw, workspaceStatus]);

  useEffect(() => {
    const controller = new AbortController();
    const timer = window.setTimeout(() => void load(controller.signal), 0);
    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [load]);

  function resetCreation() {
    setCreatingForListingId(null);
    setNewTitleEn("");
    setNewTitleSw("");
  }

  async function persistCategories(next: CategoriesState, listingId: string, message: string) {
    if (!site || !canManage) return;
    setSavingListingId(listingId);
    try {
      const payload = categoriesPayload(next);
      const response = await request((token) => updateWebsiteSite(
        businessId,
        site.id,
        { categories: payload },
        token,
      ));
      setSite(response.data ?? { ...site, categories: payload });
      notify({ message, tone: "success" });
    } catch (saveError) {
      notify({
        message: saveError instanceof Error
          ? saveError.message
          : sw ? "Kundi halijasasishwa." : "Category membership could not be updated.",
        tone: "error",
      });
    } finally {
      setSavingListingId(null);
    }
  }

  async function toggleCategory(listingId: string, categoryIdValue: string) {
    const category = categories.items.find((item) => item.id === categoryIdValue);
    if (!category) return;
    const included = category.listingIds.includes(listingId);
    const next: CategoriesState = {
      ...categories,
      items: categories.items.map((item) => item.id === categoryIdValue
        ? {
            ...item,
            familyIds: [],
            listingIds: included
              ? item.listingIds.filter((id) => id !== listingId)
              : [...item.listingIds, listingId],
          }
        : item),
    };
    await persistCategories(
      next,
      listingId,
      included
        ? (sw ? "Bidhaa imeondolewa kwenye kundi." : "Product removed from category.")
        : (sw ? "Bidhaa imeongezwa kwenye kundi." : "Product added to category."),
    );
  }

  async function createAndAssign(listingId: string) {
    if (!site || !canManage) return;
    if (categories.items.length >= MAX_CATEGORIES) {
      notify({
        message: sw
          ? `Umefikia kikomo cha makundi ${MAX_CATEGORIES}.`
          : `You have reached the ${MAX_CATEGORIES}-category limit.`,
        tone: "error",
      });
      return;
    }
    if (!newTitleEn.trim() && !newTitleSw.trim()) {
      notify({
        message: sw ? "Weka jina la kundi." : "Enter a category name.",
        tone: "error",
      });
      return;
    }

    const fallbackTitle = newTitleEn.trim() || newTitleSw.trim();
    const id = categoryId(fallbackTitle);
    const item: CategoryItem = {
      id,
      title: { en: newTitleEn.trim(), sw: newTitleSw.trim() },
      listingIds: [listingId],
      familyIds: [],
      raw: {
        id,
        source: "catalog",
        listingIds: [listingId],
        familyIds: [],
        title: { en: newTitleEn.trim(), sw: newTitleSw.trim() },
        description: { en: "", sw: "" },
        href: `/products?category=${encodeURIComponent(id)}`,
        imageUrl: "",
        imageMediaId: "",
      },
    };
    const next = { ...categories, items: [...categories.items, item] };
    await persistCategories(
      next,
      listingId,
      sw ? "Kundi limeundwa na bidhaa imeongezwa." : "Category created and product added.",
    );
    resetCreation();
  }

  if (workspaceStatus !== "ready" || loading) {
    return <section className="flex min-h-28 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-500 dark:border-slate-800 dark:bg-slate-950"><Loader2 className="size-4 animate-spin" />{sw ? "Inapakia makundi..." : "Loading category assignments..."}</section>;
  }

  if (error) {
    return <section className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/30 dark:text-red-300">{error}</section>;
  }

  if (!site || listings.length === 0) return null;

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-950 sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <FolderPlus className="size-4 text-sky-600 dark:text-sky-400" />
            <h2 className="text-sm font-medium text-slate-950 dark:text-white">{sw ? "Panga bidhaa kwenye makundi" : "Assign products to categories"}</h2>
          </div>
          <p className="mt-1 max-w-3xl text-xs leading-5 text-slate-500 dark:text-slate-400">
            {sw
              ? "Ongeza bidhaa kwenye kundi moja au zaidi, au iache bila kundi. Hali ya kundi haiathiri uwezo wa kuchapisha bidhaa."
              : "Add a product to one or more categories, or leave it uncategorized. Category membership does not block publishing."}
          </p>
        </div>
        <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-medium text-slate-500 dark:bg-slate-900 dark:text-slate-400">
          {categories.items.length}/{MAX_CATEGORIES} {sw ? "makundi" : "categories"}
        </span>
      </div>

      <div className="mt-4 divide-y divide-slate-200 rounded-lg border border-slate-200 dark:divide-slate-800 dark:border-slate-800">
        {listings.map((listing) => {
          const assigned = categories.items.filter((category) => category.listingIds.includes(listing.id));
          const open = openListingId === listing.id;
          const saving = savingListingId === listing.id;
          const creating = creatingForListingId === listing.id;
          return (
            <article className="p-3 sm:p-4" key={listing.id}>
              <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="truncate text-sm font-medium text-slate-900 dark:text-white">{listingTitle(listing, sw)}</p>
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${listing.is_published ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-300" : "bg-slate-100 text-slate-500 dark:bg-slate-900 dark:text-slate-400"}`}>
                      {listing.is_published ? (sw ? "Imechapishwa" : "Published") : (sw ? "Rasimu" : "Draft")}
                    </span>
                  </div>
                  <div className="mt-2 flex flex-wrap items-center gap-1.5">
                    {assigned.length ? assigned.map((category) => (
                      <span className="inline-flex items-center gap-1 rounded-full bg-sky-50 px-2 py-1 text-[11px] font-medium text-sky-700 dark:bg-sky-950/30 dark:text-sky-300" key={category.id}>
                        {categoryTitle(category, sw)}
                        {canManage ? (
                          <button aria-label={sw ? "Ondoa kwenye kundi" : "Remove from category"} disabled={saving} onClick={() => void toggleCategory(listing.id, category.id)} type="button">
                            <X className="size-3" />
                          </button>
                        ) : null}
                      </span>
                    )) : (
                      <span className="rounded-full bg-amber-50 px-2 py-1 text-[11px] font-medium text-amber-700 dark:bg-amber-950/30 dark:text-amber-300">{sw ? "Bila kundi" : "Uncategorized"}</span>
                    )}
                  </div>
                </div>

                {canManage ? (
                  <Button disabled={saving} onClick={() => {
                    setOpenListingId(open ? null : listing.id);
                    if (open) resetCreation();
                  }} size="small" variant="outline">
                    {saving ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />}
                    {sw ? "Ongeza kwenye kundi" : "Add to category"}
                  </Button>
                ) : null}
              </div>

              {open ? (
                <div className="mt-3 rounded-lg bg-slate-50 p-3 dark:bg-slate-900/50">
                  <p className="text-[11px] font-medium uppercase tracking-wide text-slate-400">{sw ? "Makundi yaliyopo" : "Existing categories"}</p>
                  {categories.items.length ? (
                    <div className="mt-2 grid gap-1 sm:grid-cols-2 lg:grid-cols-3">
                      {categories.items.map((category) => {
                        const checked = category.listingIds.includes(listing.id);
                        return (
                          <label className={`flex cursor-pointer items-center gap-2 rounded-md border px-2.5 py-2 text-xs ${checked ? "border-sky-200 bg-white text-sky-700 dark:border-sky-900 dark:bg-slate-950 dark:text-sky-300" : "border-transparent text-slate-600 hover:bg-white dark:text-slate-300 dark:hover:bg-slate-950"}`} key={category.id}>
                            <input checked={checked} disabled={saving} onChange={() => void toggleCategory(listing.id, category.id)} type="checkbox" />
                            <span className="min-w-0 flex-1 truncate">{categoryTitle(category, sw)}</span>
                            {checked ? <Check className="size-3.5" /> : null}
                          </label>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="mt-2 text-xs text-slate-500">{sw ? "Hakuna makundi bado. Unaweza kuunda kundi hapa chini." : "No categories yet. You can create one below."}</p>
                  )}

                  <div className="mt-3 border-t border-slate-200 pt-3 dark:border-slate-800">
                    {!creating ? (
                      <button className="inline-flex items-center gap-1.5 text-xs font-medium text-sky-700 hover:text-sky-900 dark:text-sky-300 dark:hover:text-sky-200" disabled={categories.items.length >= MAX_CATEGORIES} onClick={() => setCreatingForListingId(listing.id)} type="button">
                        <Plus className="size-3.5" />
                        {sw ? "Unda kundi jipya" : "Create new category"}
                      </button>
                    ) : (
                      <div className="space-y-3">
                        <div className="grid gap-2 sm:grid-cols-2">
                          <input className={inputClassName} onChange={(event) => setNewTitleEn(event.target.value)} placeholder="Category name (English)" value={newTitleEn} />
                          <input className={inputClassName} onChange={(event) => setNewTitleSw(event.target.value)} placeholder="Jina la kundi (Kiswahili)" value={newTitleSw} />
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <Button disabled={saving || (!newTitleEn.trim() && !newTitleSw.trim())} onClick={() => void createAndAssign(listing.id)} size="small">
                            {saving ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />}
                            {sw ? "Unda na ongeza bidhaa" : "Create and add product"}
                          </Button>
                          <Button onClick={resetCreation} size="small" variant="ghost">{sw ? "Ghairi" : "Cancel"}</Button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ) : null}
            </article>
          );
        })}
      </div>

      <p className="mt-3 text-[11px] leading-5 text-slate-400">
        {sw
          ? "Kumbuka: uteuzi wa zamani unaotumia Commerce family unasimamiwa kwenye kichupo cha Makundi. Hapa tunaonyesha uanachama wa moja kwa moja wa bidhaa za Website."
          : "Note: legacy Commerce-family membership is managed from the Categories tab. This panel shows direct Website product membership."}
      </p>
    </section>
  );
}
