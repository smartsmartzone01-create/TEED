"use client";

import { Grid2X2, ImagePlus, Loader2, Plus, Save, Trash2 } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";

import { Button } from "@/components/global/primitives/button";
import { useWebsiteRequest } from "@/hooks/website/use-website-request";
import { useNotification } from "@/providers/global/notification-provider";
import { useWorkspace } from "@/providers/workspace/workspace-provider";
import {
  createWebsiteSite,
  getWebsiteCommerceCatalog,
  getWebsiteSites,
  updateWebsiteSite,
  uploadWebsiteMedia,
} from "@/services/website/website";
import type { WebsiteCommerceProduct, WebsiteSite } from "@/types/website/website";

type Props = { businessId: string; locale: string };
type LocalizedValue = { en: string; sw: string };
type CategorySource = "standalone" | "family";
type CategoryDraft = {
  id: string;
  source: CategorySource;
  familyId: string;
  title: LocalizedValue;
  description: LocalizedValue;
  href: string;
  imageUrl: string;
  imageMediaId: string;
};
type Draft = { enabled: boolean; title: LocalizedValue; items: CategoryDraft[] };
type FamilyOption = { id: string; name: string; brand: string };

const inputClassName = "h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-900 outline-none focus:border-slate-500 dark:border-slate-700 dark:bg-slate-950 dark:text-white";

function objectValue(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function localizedValue(value: unknown, fallback: LocalizedValue = { en: "", sw: "" }): LocalizedValue {
  const source = objectValue(value);
  return {
    en: typeof source.en === "string" ? source.en : fallback.en,
    sw: typeof source.sw === "string" ? source.sw : fallback.sw,
  };
}

function blankCategory(index: number): CategoryDraft {
  return {
    id: `category-${Date.now()}-${index}`,
    source: "standalone",
    familyId: "",
    title: { en: "", sw: "" },
    description: { en: "", sw: "" },
    href: "/products",
    imageUrl: "",
    imageMediaId: "",
  };
}

function normalize(value: unknown): Draft {
  const source = objectValue(value);
  const items = Array.isArray(source.items)
    ? source.items.slice(0, 30).flatMap((value, index) => {
        const item = objectValue(value);
        if (!Object.keys(item).length) return [];
        const familyId = typeof item.familyId === "string" ? item.familyId : "";
        return [{
          id: typeof item.id === "string" && item.id ? item.id : `category-${index + 1}`,
          source: item.source === "family" && familyId ? "family" as const : "standalone" as const,
          familyId,
          title: localizedValue(item.title),
          description: localizedValue(item.description),
          href: typeof item.href === "string" && item.href ? item.href : "/products",
          imageUrl: typeof item.imageUrl === "string" ? item.imageUrl : "",
          imageMediaId: typeof item.imageMediaId === "string" ? item.imageMediaId : "",
        }];
      })
    : [];
  return {
    enabled: source.enabled !== false,
    title: localizedValue(source.title, { en: "Products", sw: "Bidhaa" }),
    items,
  };
}

function payloadFor(draft: Draft) {
  return {
    enabled: draft.enabled,
    title: { en: draft.title.en.trim(), sw: draft.title.sw.trim() },
    items: draft.items.map((item) => ({
      id: item.id,
      source: item.source,
      familyId: item.source === "family" ? item.familyId : "",
      title: { en: item.title.en.trim(), sw: item.title.sw.trim() },
      description: { en: item.description.en.trim(), sw: item.description.sw.trim() },
      href: item.source === "family" && item.familyId ? `/products?family=${item.familyId}` : item.href.trim() || "/products",
      imageUrl: item.imageUrl,
      imageMediaId: item.imageMediaId,
    })),
  };
}

function familyOptions(products: WebsiteCommerceProduct[]): FamilyOption[] {
  const families = new Map<string, FamilyOption>();
  products.forEach((product) => {
    if (!product.family_id || !product.family_name) return;
    if (!families.has(product.family_id)) families.set(product.family_id, { id: product.family_id, name: product.family_name, brand: product.brand });
  });
  return [...families.values()].sort((a, b) => a.name.localeCompare(b.name));
}

export function WebsiteHomepageCategoriesManager({ businessId, locale }: Props) {
  const sw = locale === "sw";
  const request = useWebsiteRequest();
  const { notify } = useNotification();
  const { businesses, status } = useWorkspace();
  const business = businesses.find((item) => item.id === businessId);
  const canManage = Boolean(business?.membership.permissions.includes("website.manage"));
  const [site, setSite] = useState<WebsiteSite | null>(null);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [saved, setSaved] = useState("");
  const [families, setFamilies] = useState<FamilyOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingId, setUploadingId] = useState<string | null>(null);
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
      const next = normalize(activeSite.categories);
      setDraft(next);
      setSaved(JSON.stringify(next));
      try {
        const catalog = await request((token) => getWebsiteCommerceCatalog(businessId, activeSite!.id, token, signal));
        setFamilies(familyOptions(catalog.data?.products ?? []));
      } catch {
        setFamilies([]);
      }
    } catch (loadError) {
      if (!signal?.aborted) setError(loadError instanceof Error ? loadError.message : sw ? "Imeshindikana kupakia makundi." : "Categories could not be loaded.");
    } finally {
      if (!signal?.aborted) setLoading(false);
    }
  }, [businessId, canManage, request, status, sw]);

  useEffect(() => {
    const controller = new AbortController();
    const timer = window.setTimeout(() => void load(controller.signal), 0);
    return () => { window.clearTimeout(timer); controller.abort(); };
  }, [load]);

  function updateItem(id: string, change: (item: CategoryDraft) => CategoryDraft) {
    setDraft((current) => current ? { ...current, items: current.items.map((item) => item.id === id ? change(item) : item) } : current);
  }

  async function persist(nextDraft: Draft) {
    if (!site) return;
    const payload = payloadFor(nextDraft);
    const response = await request((token) => updateWebsiteSite(businessId, site.id, { categories: payload }, token));
    const updated = response.data ?? { ...site, categories: payload };
    const normalized = normalize(updated.categories);
    setSite(updated);
    setDraft(normalized);
    setSaved(JSON.stringify(normalized));
  }

  async function uploadImage(item: CategoryDraft, file: File) {
    if (!site || !draft || !canManage) return;
    setUploadingId(item.id);
    try {
      const uploaded = await request((token) => uploadWebsiteMedia(businessId, site.id, file, {
        en: item.title.en.trim() || `${site.display_name} category`,
        sw: item.title.sw.trim() || `Kundi la ${site.display_name}`,
      }, token));
      const media = uploaded.data;
      if (!media) throw new Error(sw ? "Picha haikupakiwa." : "Image was not uploaded.");
      const nextDraft = {
        ...draft,
        items: draft.items.map((current) => current.id === item.id ? { ...current, imageUrl: media.public_url, imageMediaId: media.id } : current),
      };
      await persist(nextDraft);
      notify({ message: sw ? "Picha ya kundi imepakiwa na kuhifadhiwa." : "Category image uploaded and saved.", tone: "success" });
    } catch (uploadError) {
      notify({ message: uploadError instanceof Error ? uploadError.message : sw ? "Imeshindikana kupakia picha." : "Image could not be uploaded.", tone: "error" });
    } finally {
      setUploadingId(null);
    }
  }

  async function save() {
    if (!draft || !canManage) return;
    setSaving(true);
    try {
      await persist(draft);
      notify({ message: sw ? "Makundi yamehifadhiwa." : "Categories saved.", tone: "success" });
    } catch (saveError) {
      notify({ message: saveError instanceof Error ? saveError.message : sw ? "Imeshindikana kuhifadhi." : "Could not save categories.", tone: "error" });
    } finally {
      setSaving(false);
    }
  }

  if (status !== "ready" || loading) return <article className="flex min-h-32 items-center justify-center gap-2 border-b border-slate-200 p-5 text-sm text-slate-500 dark:border-slate-800"><Loader2 className="size-4 animate-spin" />{sw ? "Inapakia makundi..." : "Loading categories..."}</article>;
  if (error || !draft) return <article className="border-b border-slate-200 p-5 dark:border-slate-800"><p className="text-sm text-red-700 dark:text-red-300">{error ?? (sw ? "Sehemu haipatikani." : "Section unavailable.")}</p></article>;

  return <article className="border-b border-slate-200 p-4 dark:border-slate-800 sm:p-5">
    <div className="flex items-start gap-4">
      <div className="flex size-10 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-slate-50 text-slate-600 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300"><Grid2X2 className="size-4" /></div>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div><div className="flex items-center gap-2"><span className="font-mono text-xs font-medium text-slate-400">04</span><h3 className="text-sm font-semibold text-slate-950 dark:text-white">{sw ? "Makundi ya bidhaa" : "Product categories"}</h3></div><p className="mt-1.5 max-w-3xl text-sm leading-6 text-slate-500 dark:text-slate-400">{sw ? "Ongeza makundi madogo ya homepage. Yanaweza kujitegemea au kuunganishwa na Product Family ya Commerce." : "Add compact homepage categories. They can stand alone or connect to a Commerce Product Family."}</p></div>
          <div className="flex gap-2"><Button disabled={!canManage || draft.items.length >= 30} onClick={() => setDraft((current) => current ? { ...current, items: [...current.items, blankCategory(current.items.length)] } : current)} size="small" variant="outline"><Plus className="size-4" />{sw ? "Ongeza" : "Add"}</Button><Button disabled={!dirty || saving || !canManage} onClick={() => void save()} size="small"><Save className="size-4" />{saving ? (sw ? "Inahifadhi..." : "Saving...") : sw ? "Hifadhi" : "Save"}</Button></div>
        </div>
        <label className="mt-4 flex items-center gap-2 text-sm font-medium text-slate-700 dark:text-slate-300"><input checked={draft.enabled} disabled={!canManage} onChange={(event) => setDraft((current) => current ? { ...current, enabled: event.target.checked } : current)} type="checkbox" />{sw ? "Onyesha makundi kwenye homepage" : "Show categories on the homepage"}</label>
        <div className="mt-4 grid gap-3 sm:grid-cols-2"><input className={inputClassName} disabled={!canManage} placeholder="Section title (English)" value={draft.title.en} onChange={(event) => setDraft((current) => current ? { ...current, title: { ...current.title, en: event.target.value } } : current)} /><input className={inputClassName} disabled={!canManage} placeholder="Kichwa (Kiswahili)" value={draft.title.sw} onChange={(event) => setDraft((current) => current ? { ...current, title: { ...current.title, sw: event.target.value } } : current)} /></div>
        <div className="mt-5 space-y-3">{draft.items.map((item, index) => <section className="grid gap-3 rounded-xl border border-slate-200 p-4 dark:border-slate-800 lg:grid-cols-[9rem_minmax(0,1fr)_auto]" key={item.id}>
          <div><div className="flex h-24 items-center justify-center overflow-hidden rounded-lg border border-dashed border-slate-300 bg-transparent p-2 dark:border-slate-700">{item.imageUrl ? <img alt={item.title.en || item.title.sw || "Category"} className="max-h-full max-w-full object-contain" src={item.imageUrl} /> : <ImagePlus className="size-6 text-slate-300" />}</div>{canManage ? <label className="mt-2 inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-md border border-slate-300 px-2.5 text-xs font-semibold dark:border-slate-700">{uploadingId === item.id ? <Loader2 className="size-3.5 animate-spin" /> : <ImagePlus className="size-3.5" />}{sw ? "Pakia" : "Upload"}<input accept="image/jpeg,image/png,image/webp" className="sr-only" disabled={uploadingId === item.id} onChange={(event) => { const file = event.currentTarget.files?.[0]; event.currentTarget.value = ""; if (file) void uploadImage(item, file); }} type="file" /></label> : null}</div>
          <div className="min-w-0 space-y-3"><div className="grid gap-3 sm:grid-cols-2"><select className={inputClassName} disabled={!canManage} value={item.source} onChange={(event) => updateItem(item.id, (current) => ({ ...current, source: event.target.value as CategorySource, familyId: event.target.value === "standalone" ? "" : current.familyId }))}><option value="standalone">Standalone</option><option value="family">Commerce Product Family</option></select>{item.source === "family" ? <select className={inputClassName} disabled={!canManage} value={item.familyId} onChange={(event) => updateItem(item.id, (current) => ({ ...current, familyId: event.target.value }))}><option value="">{sw ? "Chagua family" : "Choose family"}</option>{families.map((family) => <option key={family.id} value={family.id}>{family.brand ? `${family.brand} · ` : ""}{family.name}</option>)}</select> : <input className={inputClassName} disabled={!canManage} placeholder="/products or https://..." value={item.href} onChange={(event) => updateItem(item.id, (current) => ({ ...current, href: event.target.value }))} />}</div><div className="grid gap-3 sm:grid-cols-2"><input className={inputClassName} disabled={!canManage} placeholder="Category title (English)" value={item.title.en} onChange={(event) => updateItem(item.id, (current) => ({ ...current, title: { ...current.title, en: event.target.value } }))} /><input className={inputClassName} disabled={!canManage} placeholder="Kichwa (Kiswahili)" value={item.title.sw} onChange={(event) => updateItem(item.id, (current) => ({ ...current, title: { ...current.title, sw: event.target.value } }))} /></div><div className="grid gap-3 sm:grid-cols-2"><input className={inputClassName} disabled={!canManage} placeholder="Short text (English)" value={item.description.en} onChange={(event) => updateItem(item.id, (current) => ({ ...current, description: { ...current.description, en: event.target.value } }))} /><input className={inputClassName} disabled={!canManage} placeholder="Maelezo mafupi" value={item.description.sw} onChange={(event) => updateItem(item.id, (current) => ({ ...current, description: { ...current.description, sw: event.target.value } }))} /></div></div>
          <Button disabled={!canManage} onClick={() => setDraft((current) => current ? { ...current, items: current.items.filter((candidate) => candidate.id !== item.id) } : current)} size="small" variant="outline"><Trash2 className="size-4" /><span className="sr-only">{sw ? `Ondoa ${index + 1}` : `Remove ${index + 1}`}</span></Button>
        </section>)}</div>
      </div>
    </div>
  </article>;
}
