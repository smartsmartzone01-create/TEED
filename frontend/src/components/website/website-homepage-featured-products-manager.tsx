"use client";

import { Loader2, Save, ShoppingBag } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";

import { Button } from "@/components/global/primitives/button";
import { useWebsiteRequest } from "@/hooks/website/use-website-request";
import { useNotification } from "@/providers/global/notification-provider";
import { useWorkspace } from "@/providers/workspace/workspace-provider";
import {
  createWebsiteSite,
  getWebsiteListings,
  getWebsiteSites,
  updateWebsiteSite,
} from "@/services/website/website";
import type { WebsiteListing, WebsiteSite } from "@/types/website/website";

type Props = { businessId: string; locale: string };
type Draft = { enabled: boolean; listingIds: string[]; title: { en: string; sw: string } };

function objectValue(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function normalize(value: unknown): Draft {
  const source = objectValue(value);
  const title = objectValue(source.title);
  return {
    enabled: source.enabled !== false,
    listingIds: Array.isArray(source.listingIds)
      ? source.listingIds.filter((item): item is string => typeof item === "string").slice(0, 4)
      : [],
    title: {
      en: typeof title.en === "string" ? title.en : "Featured products",
      sw: typeof title.sw === "string" ? title.sw : "Bidhaa zilizochaguliwa",
    },
  };
}

function labelFor(listing: WebsiteListing, sw: boolean) {
  return listing.title[sw ? "sw" : "en"] || listing.title.en || listing.title.sw || listing.slug;
}

export function WebsiteHomepageFeaturedProductsManager({ businessId, locale }: Props) {
  const sw = locale === "sw";
  const request = useWebsiteRequest();
  const { notify } = useNotification();
  const { businesses, status } = useWorkspace();
  const business = businesses.find((item) => item.id === businessId);
  const canManage = Boolean(business?.membership.permissions.includes("website.manage"));
  const [site, setSite] = useState<WebsiteSite | null>(null);
  const [listings, setListings] = useState<WebsiteListing[]>([]);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [saved, setSaved] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const dirty = useMemo(() => Boolean(draft && JSON.stringify(draft) !== saved), [draft, saved]);

  const load = useCallback(async (signal?: AbortSignal) => {
    if (status !== "ready") return;
    setLoading(true);
    setError(null);
    try {
      const sites = await request((token) => getWebsiteSites(businessId, token, signal));
      let activeSite = sites.data?.sites[0] ?? null;
      if (!activeSite && canManage) {
        const created = await request((token) => createWebsiteSite(businessId, token));
        activeSite = created.data ?? null;
      }
      setSite(activeSite);
      if (!activeSite) return;
      const nextDraft = normalize(activeSite.featured_products);
      setDraft(nextDraft);
      setSaved(JSON.stringify(nextDraft));
      const response = await request((token) => getWebsiteListings(businessId, activeSite.id, token, signal));
      setListings((response.data?.listings ?? []).filter((item) => item.is_published));
    } catch (loadError) {
      if (!signal?.aborted) setError(loadError instanceof Error ? loadError.message : sw ? "Imeshindikana kupakia bidhaa zilizochaguliwa." : "Featured products could not be loaded.");
    } finally {
      if (!signal?.aborted) setLoading(false);
    }
  }, [businessId, canManage, request, status, sw]);

  useEffect(() => {
    const controller = new AbortController();
    const initialLoad = window.setTimeout(() => void load(controller.signal), 0);
    return () => {
      window.clearTimeout(initialLoad);
      controller.abort();
    };
  }, [load]);

  function toggleListing(id: string) {
    if (!draft) return;
    const selected = draft.listingIds.includes(id);
    if (!selected && draft.listingIds.length >= 4) {
      notify({ message: sw ? "Chagua hadi bidhaa nne." : "Choose up to four products.", tone: "error" });
      return;
    }
    setDraft({
      ...draft,
      listingIds: selected
        ? draft.listingIds.filter((item) => item !== id)
        : [...draft.listingIds, id],
    });
  }

  async function save() {
    if (!site || !draft || !canManage) return;
    setSaving(true);
    try {
      const payload = {
        enabled: draft.enabled,
        listingIds: draft.listingIds,
        title: { en: draft.title.en.trim(), sw: draft.title.sw.trim() },
      };
      const response = await request((token) => updateWebsiteSite(businessId, site.id, { featured_products: payload }, token));
      const updated = response.data ?? { ...site, featured_products: payload };
      const next = normalize(updated.featured_products);
      setSite(updated);
      setDraft(next);
      setSaved(JSON.stringify(next));
      notify({ message: sw ? "Bidhaa za ukurasa wa mwanzo zimehifadhiwa." : "Homepage products saved.", tone: "success" });
    } catch (saveError) {
      notify({ message: saveError instanceof Error ? saveError.message : sw ? "Imeshindikana kuhifadhi." : "Could not save featured products.", tone: "error" });
    } finally {
      setSaving(false);
    }
  }

  if (status !== "ready" || loading) {
    return <article className="flex min-h-32 items-center justify-center gap-2 border-b border-slate-200 p-5 text-sm text-slate-500 dark:border-slate-800"><Loader2 className="size-4 animate-spin" />{sw ? "Inapakia bidhaa..." : "Loading products..."}</article>;
  }

  if (error || !draft) {
    return <article className="border-b border-slate-200 p-5 dark:border-slate-800"><p className="text-sm text-red-700 dark:text-red-300">{error ?? (sw ? "Sehemu haipatikani." : "Section unavailable.")}</p></article>;
  }

  return (
    <article className="border-b border-slate-200 p-4 dark:border-slate-800 sm:p-5">
      <div className="flex items-start gap-4">
        <div className="flex size-10 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-slate-50 text-slate-600 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300"><ShoppingBag className="size-4" /></div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div><div className="flex items-center gap-2"><span className="font-mono text-xs font-medium text-slate-400">03</span><h3 className="text-sm font-semibold text-slate-950 dark:text-white">{sw ? "Bidhaa zilizochaguliwa" : "Featured products"}</h3></div><p className="mt-1.5 max-w-2xl text-sm leading-6 text-slate-500 dark:text-slate-400">{sw ? "Chagua hadi bidhaa nne za kuzunguka kiotomatiki kila sekunde tano baada ya Hero." : "Choose up to four products to rotate automatically every five seconds immediately after the Hero."}</p></div>
            <Button disabled={!dirty || saving || !canManage} onClick={() => void save()} size="small"><Save className="size-4" />{saving ? (sw ? "Inahifadhi..." : "Saving...") : sw ? "Hifadhi" : "Save"}</Button>
          </div>

          <label className="mt-4 flex items-center gap-2 text-sm font-medium text-slate-700 dark:text-slate-300"><input checked={draft.enabled} disabled={!canManage} onChange={(event) => setDraft((current) => current ? { ...current, enabled: event.target.checked } : current)} type="checkbox" />{sw ? "Onyesha sehemu hii kwenye storefront" : "Show this section on the storefront"}</label>

          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <label className="text-xs font-medium text-slate-600 dark:text-slate-300">English title<input className="mt-1 h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm dark:border-slate-700 dark:bg-slate-950" disabled={!canManage} value={draft.title.en} onChange={(event) => setDraft((current) => current ? { ...current, title: { ...current.title, en: event.target.value } } : current)} /></label>
            <label className="text-xs font-medium text-slate-600 dark:text-slate-300">Kichwa cha Kiswahili<input className="mt-1 h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm dark:border-slate-700 dark:bg-slate-950" disabled={!canManage} value={draft.title.sw} onChange={(event) => setDraft((current) => current ? { ...current, title: { ...current.title, sw: event.target.value } } : current)} /></label>
          </div>

          <div className="mt-4">
            <div className="mb-2 flex items-center justify-between gap-3"><p className="text-xs font-semibold uppercase tracking-[0.1em] text-slate-400">{sw ? "Chagua bidhaa" : "Choose products"}</p><span className="text-xs text-slate-400">{draft.listingIds.length}/4</span></div>
            {listings.length ? <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">{listings.map((listing) => { const selected = draft.listingIds.includes(listing.id); return <button className={`rounded-lg border p-3 text-left text-sm transition ${selected ? "border-slate-950 bg-slate-950 text-white dark:border-white dark:bg-white dark:text-slate-950" : "border-slate-200 bg-slate-50 text-slate-700 hover:border-slate-400 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300"}`} disabled={!canManage} key={listing.id} onClick={() => toggleListing(listing.id)} type="button"><span className="block font-semibold">{labelFor(listing, sw)}</span><span className={`mt-1 block text-xs ${selected ? "opacity-70" : "text-slate-400"}`}>{selected ? (sw ? "Imechaguliwa" : "Selected") : sw ? "Bofya kuchagua" : "Click to select"}</span></button>; })}</div> : <p className="rounded-lg border border-dashed border-slate-300 p-4 text-sm text-slate-500 dark:border-slate-700">{sw ? "Chapisha bidhaa kwenye Website kwanza, kisha zitaonekana hapa." : "Publish Website products first, then they will appear here."}</p>}
          </div>
        </div>
      </div>
    </article>
  );
}
