"use client";

import { ImagePlus, Loader2, Plus, Save, ShoppingBag, Trash2 } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";

import { Button } from "@/components/global/primitives/button";
import { WebsiteNavigationDestinationField } from "@/components/website/website-navigation-destination-field";
import { useWebsiteRequest } from "@/hooks/website/use-website-request";
import { useNotification } from "@/providers/global/notification-provider";
import { useWorkspace } from "@/providers/workspace/workspace-provider";
import {
  createWebsiteSite,
  getWebsiteListings,
  getWebsiteSites,
  updateWebsiteSite,
  uploadWebsiteMedia,
} from "@/services/website/website";
import type {
  WebsiteListing,
  WebsiteNavigationTarget,
  WebsiteSite,
} from "@/types/website/website";

type Props = { businessId: string; locale: string };
type LocalizedValue = { en: string; sw: string };
type SlideSource = "standalone" | "listing";
type ImageSide = "left" | "right";

type SlideDraft = {
  id: string;
  source: SlideSource;
  listingId: string;
  title: LocalizedValue;
  description: LocalizedValue;
  actionLabel: LocalizedValue;
  actionTarget: WebsiteNavigationTarget;
  imageUrl: string;
  imageMediaId: string;
  imageSide: ImageSide;
  backgroundColor: string;
  textColor: string;
};

type Draft = {
  enabled: boolean;
  items: SlideDraft[];
};

const inputClassName =
  "h-10 min-w-0 w-full rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-900 outline-none focus:border-slate-500 dark:border-slate-700 dark:bg-slate-950 dark:text-white";
const textAreaClassName =
  "min-h-20 min-w-0 w-full resize-y rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-slate-500 dark:border-slate-700 dark:bg-slate-950 dark:text-white";
const DEFAULT_BACKGROUNDS = ["#eef6ff", "#fff4e8", "#effaf3", "#f6efff"];

function objectValue(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function localizedValue(value: unknown): LocalizedValue {
  const source = objectValue(value);
  return {
    en: typeof source.en === "string" ? source.en : "",
    sw: typeof source.sw === "string" ? source.sw : "",
  };
}

function normalizeTarget(value: unknown, listingId: string): WebsiteNavigationTarget {
  const source = objectValue(value);
  if (source.type === "home") return { type: "home" };
  if (source.type === "shop") return { type: "shop" };
  if (source.type === "product" && typeof source.id === "string") {
    return { type: "product", id: source.id };
  }
  if (
    source.type === "section" &&
    (source.section === "hero" ||
      source.section === "popular" ||
      source.section === "services" ||
      source.section === "footer")
  ) {
    return { type: "section", section: source.section };
  }
  if (source.type === "external" && typeof source.url === "string") {
    return { type: "external", url: source.url };
  }
  return listingId ? { type: "product", id: listingId } : { type: "shop" };
}

function blankSlide(index: number): SlideDraft {
  return {
    id: `featured-${Date.now()}-${index}`,
    source: "standalone",
    listingId: "",
    title: { en: "", sw: "" },
    description: { en: "", sw: "" },
    actionLabel: { en: "Learn more", sw: "Jifunze zaidi" },
    actionTarget: { type: "shop" },
    imageUrl: "",
    imageMediaId: "",
    imageSide: index % 2 ? "left" : "right",
    backgroundColor: DEFAULT_BACKGROUNDS[index % DEFAULT_BACKGROUNDS.length],
    textColor: "#172033",
  };
}

function normalizeSlide(value: unknown, index: number): SlideDraft | null {
  const source = objectValue(value);
  if (!Object.keys(source).length) return null;
  const listingId = typeof source.listingId === "string" ? source.listingId : "";
  return {
    id: typeof source.id === "string" && source.id ? source.id : `featured-${index + 1}`,
    source: source.source === "listing" && listingId ? "listing" : "standalone",
    listingId,
    title: localizedValue(source.title),
    description: localizedValue(source.description),
    actionLabel: localizedValue(source.actionLabel),
    actionTarget: normalizeTarget(source.actionTarget, listingId),
    imageUrl: typeof source.imageUrl === "string" ? source.imageUrl : "",
    imageMediaId: typeof source.imageMediaId === "string" ? source.imageMediaId : "",
    imageSide: source.imageSide === "left" ? "left" : "right",
    backgroundColor:
      typeof source.backgroundColor === "string" && source.backgroundColor
        ? source.backgroundColor
        : DEFAULT_BACKGROUNDS[index % DEFAULT_BACKGROUNDS.length],
    textColor:
      typeof source.textColor === "string" && source.textColor ? source.textColor : "#172033",
  };
}

function normalize(value: unknown): Draft {
  const source = objectValue(value);
  const items = Array.isArray(source.items)
    ? source.items.flatMap((item, index) => {
        const normalized = normalizeSlide(item, index);
        return normalized ? [normalized] : [];
      }).slice(0, 4)
    : [];

  if (!items.length && Array.isArray(source.listingIds)) {
    source.listingIds
      .filter((item): item is string => typeof item === "string")
      .slice(0, 4)
      .forEach((listingId, index) => {
        const slide = blankSlide(index);
        slide.id = `featured-listing-${listingId}`;
        slide.source = "listing";
        slide.listingId = listingId;
        slide.actionTarget = { type: "product", id: listingId };
        items.push(slide);
      });
  }

  return {
    enabled: source.enabled !== false,
    items,
  };
}

function payloadFor(draft: Draft) {
  return {
    enabled: draft.enabled,
    items: draft.items.map((slide) => ({
      id: slide.id,
      source: slide.source,
      listingId: slide.source === "listing" ? slide.listingId : "",
      title: { en: slide.title.en.trim(), sw: slide.title.sw.trim() },
      description: { en: slide.description.en.trim(), sw: slide.description.sw.trim() },
      actionLabel: { en: slide.actionLabel.en.trim(), sw: slide.actionLabel.sw.trim() },
      actionTarget: slide.actionTarget,
      imageUrl: slide.imageUrl,
      imageMediaId: slide.imageMediaId,
      imageSide: slide.imageSide,
      backgroundColor: slide.backgroundColor,
      textColor: slide.textColor,
    })),
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
  const [uploadingSlideId, setUploadingSlideId] = useState<string | null>(null);
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
      if (!signal?.aborted) {
        setError(loadError instanceof Error ? loadError.message : sw ? "Imeshindikana kupakia sehemu ya bidhaa maalum." : "Featured showcase could not be loaded.");
      }
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

  function updateSlide(id: string, update: (slide: SlideDraft) => SlideDraft) {
    setDraft((current) => current ? { ...current, items: current.items.map((slide) => slide.id === id ? update(slide) : slide) } : current);
  }

  function addSlide() {
    setDraft((current) => {
      if (!current || current.items.length >= 4) return current;
      return { ...current, items: [...current.items, blankSlide(current.items.length)] };
    });
  }

  function removeSlide(id: string) {
    setDraft((current) => current ? { ...current, items: current.items.filter((slide) => slide.id !== id) } : current);
  }

  async function uploadSlideImage(slide: SlideDraft, file: File) {
    if (!site || !draft || !canManage) return;
    setUploadingSlideId(slide.id);
    try {
      const uploadResponse = await request((token) => uploadWebsiteMedia(
        businessId,
        site.id,
        file,
        {
          en: slide.title.en.trim() || `${site.display_name} featured image`,
          sw: slide.title.sw.trim() || `Picha maalum ya ${site.display_name}`,
        },
        token,
      ));
      const media = uploadResponse.data;
      if (!media) throw new Error(sw ? "Picha haikupakiwa." : "Image was not uploaded.");

      const nextDraft: Draft = {
        ...draft,
        items: draft.items.map((current) =>
          current.id === slide.id
            ? { ...current, imageMediaId: media.id, imageUrl: media.public_url }
            : current,
        ),
      };
      const payload = payloadFor(nextDraft);
      const response = await request((token) =>
        updateWebsiteSite(businessId, site.id, { featured_products: payload }, token),
      );
      const updated = response.data ?? { ...site, featured_products: payload };
      const persisted = normalize(updated.featured_products);
      setSite(updated);
      setDraft(persisted);
      setSaved(JSON.stringify(persisted));
      notify({
        message: sw
          ? "Picha imepakiwa na kuhifadhiwa."
          : "Image uploaded and saved.",
        tone: "success",
      });
    } catch (uploadError) {
      notify({ message: uploadError instanceof Error ? uploadError.message : sw ? "Imeshindikana kupakia picha." : "Image could not be uploaded.", tone: "error" });
    } finally {
      setUploadingSlideId(null);
    }
  }

  async function save() {
    if (!site || !draft || !canManage) return;
    setSaving(true);
    try {
      const payload = payloadFor(draft);
      const response = await request((token) => updateWebsiteSite(businessId, site.id, { featured_products: payload }, token));
      const updated = response.data ?? { ...site, featured_products: payload };
      const next = normalize(updated.featured_products);
      setSite(updated);
      setDraft(next);
      setSaved(JSON.stringify(next));
      notify({ message: sw ? "Sehemu ya bidhaa maalum imehifadhiwa." : "Featured showcase saved.", tone: "success" });
    } catch (saveError) {
      notify({ message: saveError instanceof Error ? saveError.message : sw ? "Imeshindikana kuhifadhi." : "Could not save featured showcase.", tone: "error" });
    } finally {
      setSaving(false);
    }
  }

  if (status !== "ready" || loading) {
    return <article className="flex min-h-32 items-center justify-center gap-2 border-b border-slate-200 p-5 text-sm text-slate-500 dark:border-slate-800"><Loader2 className="size-4 animate-spin" />{sw ? "Inapakia sehemu..." : "Loading showcase..."}</article>;
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
            <div>
              <div className="flex items-center gap-2"><span className="font-mono text-xs font-medium text-slate-400">03</span><h3 className="text-sm font-semibold text-slate-950 dark:text-white">{sw ? "Bidhaa maalum" : "Featured showcase"}</h3></div>
              <p className="mt-1.5 max-w-3xl text-sm leading-6 text-slate-500 dark:text-slate-400">{sw ? "Tengeneza hadi slides nne za kujitegemea, au ziunganishe na bidhaa za Website. Kila slide ina picha, maandishi, kitufe na rangi yake." : "Build up to four standalone slides, or optionally connect them to Website products. Each slide owns its image, copy, CTA, and background."}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button disabled={!canManage || draft.items.length >= 4} onClick={addSlide} size="small" variant="outline"><Plus className="size-4" />{sw ? "Ongeza slide" : "Add slide"}</Button>
              <Button disabled={!dirty || saving || !canManage} onClick={() => void save()} size="small"><Save className="size-4" />{saving ? (sw ? "Inahifadhi..." : "Saving...") : sw ? "Hifadhi" : "Save"}</Button>
            </div>
          </div>

          <label className="mt-4 flex items-center gap-2 text-sm font-medium text-slate-700 dark:text-slate-300"><input checked={draft.enabled} disabled={!canManage} onChange={(event) => setDraft((current) => current ? { ...current, enabled: event.target.checked } : current)} type="checkbox" />{sw ? "Onyesha sehemu hii kwenye storefront" : "Show this section on the storefront"}</label>

          <div className="mt-3 rounded-lg border border-sky-200 bg-sky-50 px-4 py-3 text-xs leading-5 text-sky-800 dark:border-sky-900 dark:bg-sky-950/30 dark:text-sky-200">{sw ? "Picha za PNG/WEBP zenye background wazi zinapendekezwa, lakini si lazima. Storefront itatumia object-contain ili isipunguze picha." : "Transparent PNG/WEBP product images are recommended, but not required. The storefront uses contain sizing so uploaded images are not cropped."}</div>

          {draft.items.length ? (
            <div className="mt-5 space-y-4">
              {draft.items.map((slide, index) => (
                <section className="rounded-xl border border-slate-200 bg-slate-50/40 p-4 dark:border-slate-800 dark:bg-slate-900/30" key={slide.id}>
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div><p className="text-xs font-semibold uppercase tracking-[0.1em] text-slate-400">{sw ? `Slide ${index + 1}` : `Slide ${index + 1}`}</p><p className="mt-1 text-xs text-slate-500">{slide.source === "listing" ? (sw ? "Imeunganishwa na bidhaa" : "Product connected") : (sw ? "Inajitegemea" : "Standalone")}</p></div>
                    <Button disabled={!canManage} onClick={() => removeSlide(slide.id)} size="small" variant="outline"><Trash2 className="size-4" />{sw ? "Ondoa" : "Remove"}</Button>
                  </div>

                  <div className="mt-4 grid gap-4 xl:grid-cols-[minmax(0,1.35fr)_minmax(16rem,.65fr)]">
                    <div className="min-w-0 space-y-4">
                      <div className="grid gap-3 sm:grid-cols-2">
                        <label className="text-xs font-medium text-slate-600 dark:text-slate-300">{sw ? "Chanzo" : "Source"}<select className={`${inputClassName} mt-1`} disabled={!canManage} value={slide.source} onChange={(event) => { const source = event.target.value as SlideSource; updateSlide(slide.id, (current) => ({ ...current, source, listingId: source === "standalone" ? "" : current.listingId, actionTarget: source === "standalone" ? current.actionTarget : current.listingId ? { type: "product", id: current.listingId } : current.actionTarget })); }}><option value="standalone">{sw ? "Standalone" : "Standalone"}</option><option value="listing">{sw ? "Bidhaa ya Website" : "Website product"}</option></select></label>
                        {slide.source === "listing" ? <label className="text-xs font-medium text-slate-600 dark:text-slate-300">{sw ? "Bidhaa" : "Product"}<select className={`${inputClassName} mt-1`} disabled={!canManage} value={slide.listingId} onChange={(event) => { const listingId = event.target.value; updateSlide(slide.id, (current) => ({ ...current, listingId, actionTarget: listingId ? { type: "product", id: listingId } : current.actionTarget })); }}><option value="">{sw ? "Chagua bidhaa" : "Choose product"}</option>{listings.map((listing) => <option key={listing.id} value={listing.id}>{labelFor(listing, sw)}</option>)}</select></label> : <div className="rounded-md border border-dashed border-slate-300 px-3 py-2 text-xs leading-5 text-slate-500 dark:border-slate-700">{sw ? "Hii slide haitategemea Commerce au catalog." : "This slide does not depend on Commerce or the catalog."}</div>}
                      </div>

                      <div className="grid gap-3 sm:grid-cols-2"><input aria-label="Featured title English" className={inputClassName} disabled={!canManage} placeholder="Featured title (English)" value={slide.title.en} onChange={(event) => updateSlide(slide.id, (current) => ({ ...current, title: { ...current.title, en: event.target.value } }))} /><input aria-label="Featured title Kiswahili" className={inputClassName} disabled={!canManage} placeholder="Kichwa (Kiswahili)" value={slide.title.sw} onChange={(event) => updateSlide(slide.id, (current) => ({ ...current, title: { ...current.title, sw: event.target.value } }))} /></div>
                      <div className="grid gap-3 sm:grid-cols-2"><textarea aria-label="Featured description English" className={textAreaClassName} disabled={!canManage} placeholder="Supporting text (English)" value={slide.description.en} onChange={(event) => updateSlide(slide.id, (current) => ({ ...current, description: { ...current.description, en: event.target.value } }))} /><textarea aria-label="Featured description Kiswahili" className={textAreaClassName} disabled={!canManage} placeholder="Maelezo (Kiswahili)" value={slide.description.sw} onChange={(event) => updateSlide(slide.id, (current) => ({ ...current, description: { ...current.description, sw: event.target.value } }))} /></div>
                      <div className="grid gap-3 sm:grid-cols-2"><input aria-label="Featured CTA English" className={inputClassName} disabled={!canManage} placeholder="Button text (English)" value={slide.actionLabel.en} onChange={(event) => updateSlide(slide.id, (current) => ({ ...current, actionLabel: { ...current.actionLabel, en: event.target.value } }))} /><input aria-label="Featured CTA Kiswahili" className={inputClassName} disabled={!canManage} placeholder="Kitufe (Kiswahili)" value={slide.actionLabel.sw} onChange={(event) => updateSlide(slide.id, (current) => ({ ...current, actionLabel: { ...current.actionLabel, sw: event.target.value } }))} /></div>
                      <WebsiteNavigationDestinationField disabled={!canManage} listings={listings} locale={locale} onChange={(actionTarget) => updateSlide(slide.id, (current) => ({ ...current, actionTarget }))} value={slide.actionTarget} />
                    </div>

                    <div className="min-w-0 space-y-4">
                      <div className="rounded-lg border border-slate-200 bg-white p-3 dark:border-slate-700 dark:bg-slate-950">
                        <p className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-400">{sw ? "Picha" : "Image"}</p>
                        <div className="mt-2 flex min-h-32 items-center justify-center overflow-hidden rounded-md border border-dashed border-slate-300 p-2 dark:border-slate-700">{slide.imageUrl ? <img alt={slide.title.en || slide.title.sw || "Featured slide"} className="max-h-36 max-w-full object-contain" src={slide.imageUrl} /> : <ImagePlus className="size-7 text-slate-300" />}</div>
                        {canManage ? <div className="mt-2 flex flex-wrap gap-2"><label className="inline-flex h-9 cursor-pointer items-center gap-2 rounded-md border border-slate-300 px-3 text-xs font-semibold text-slate-700 dark:border-slate-700 dark:text-slate-200">{uploadingSlideId === slide.id ? <Loader2 className="size-4 animate-spin" /> : <ImagePlus className="size-4" />}{uploadingSlideId === slide.id ? (sw ? "Inapakia..." : "Uploading...") : (sw ? "Pakia picha" : "Upload image")}<input accept="image/jpeg,image/png,image/webp" className="sr-only" disabled={uploadingSlideId === slide.id} onChange={(event) => { const file = event.currentTarget.files?.[0]; event.currentTarget.value = ""; if (file) void uploadSlideImage(slide, file); }} type="file" /></label>{slide.imageUrl ? <Button onClick={() => updateSlide(slide.id, (current) => ({ ...current, imageUrl: "", imageMediaId: "" }))} size="small" variant="outline">{sw ? "Ondoa picha" : "Remove image"}</Button> : null}</div> : null}
                      </div>

                      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
                        <label className="text-xs font-medium text-slate-600 dark:text-slate-300">{sw ? "Rangi ya background" : "Background color"}<div className="mt-1 flex gap-2"><input className="h-10 w-14 rounded-md border border-slate-300 bg-white p-1 dark:border-slate-700 dark:bg-slate-950" disabled={!canManage} type="color" value={slide.backgroundColor} onChange={(event) => updateSlide(slide.id, (current) => ({ ...current, backgroundColor: event.target.value }))} /><input className={inputClassName} disabled={!canManage} value={slide.backgroundColor} onChange={(event) => updateSlide(slide.id, (current) => ({ ...current, backgroundColor: event.target.value }))} /></div></label>
                        <label className="text-xs font-medium text-slate-600 dark:text-slate-300">{sw ? "Rangi ya maandishi" : "Text color"}<div className="mt-1 flex gap-2"><input className="h-10 w-14 rounded-md border border-slate-300 bg-white p-1 dark:border-slate-700 dark:bg-slate-950" disabled={!canManage} type="color" value={slide.textColor} onChange={(event) => updateSlide(slide.id, (current) => ({ ...current, textColor: event.target.value }))} /><input className={inputClassName} disabled={!canManage} value={slide.textColor} onChange={(event) => updateSlide(slide.id, (current) => ({ ...current, textColor: event.target.value }))} /></div></label>
                        <label className="text-xs font-medium text-slate-600 dark:text-slate-300">{sw ? "Upande wa picha" : "Image side"}<select className={`${inputClassName} mt-1`} disabled={!canManage} value={slide.imageSide} onChange={(event) => updateSlide(slide.id, (current) => ({ ...current, imageSide: event.target.value as ImageSide }))}><option value="right">{sw ? "Kulia" : "Right"}</option><option value="left">{sw ? "Kushoto" : "Left"}</option></select></label>
                      </div>
                    </div>
                  </div>
                </section>
              ))}
            </div>
          ) : (
            <div className="mt-5 rounded-xl border border-dashed border-slate-300 px-5 py-10 text-center dark:border-slate-700"><ShoppingBag className="mx-auto size-7 text-slate-300" /><p className="mt-3 text-sm font-medium text-slate-700 dark:text-slate-200">{sw ? "Hakuna slide bado." : "No showcase slides yet."}</p><p className="mt-1 text-xs text-slate-500">{sw ? "Ongeza slide ya standalone; Commerce si lazima." : "Add a standalone slide; Commerce is not required."}</p></div>
          )}
        </div>
      </div>
    </article>
  );
}
