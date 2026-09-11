"use client";

import { Loader2, Plus, RefreshCw, Save, Trash2 } from "lucide-react";
import { useLocale } from "next-intl";
import { useCallback, useEffect, useMemo, useState } from "react";

import { Button } from "@/components/global/primitives/button";
import { useWebsiteRequest } from "@/hooks/website/use-website-request";
import { useNotification } from "@/providers/global/notification-provider";
import { useWorkspace } from "@/providers/workspace/workspace-provider";
import {
  createWebsiteListing,
  createWebsiteVariant,
  deleteWebsiteListing,
  deleteWebsiteVariant,
  getWebsiteListings,
  getWebsiteMedia,
  getWebsiteSites,
  updateWebsiteListing,
  updateWebsiteVariant,
} from "@/services/website/website";
import type {
  WebsiteListing,
  WebsiteMedia,
  WebsiteSite,
  WebsiteVariant,
  WebsiteVariantAvailability,
} from "@/types/website/website";

const fieldClassName =
  "h-10 w-full rounded-lg border border-slate-300 bg-transparent px-3 text-sm outline-none focus:border-slate-500 dark:border-slate-700";

function parseOptions(value: string): Record<string, string> | null {
  if (!value.trim()) return {};
  try {
    const parsed = JSON.parse(value) as unknown;
    if (!parsed || Array.isArray(parsed) || typeof parsed !== "object") return null;
    const entries = Object.entries(parsed);
    if (entries.some(([key, item]) => !key || typeof item !== "string")) return null;
    return Object.fromEntries(entries) as Record<string, string>;
  } catch {
    return null;
  }
}

function VariantEditor({
  businessId,
  canManage,
  listingId,
  media,
  onChanged,
  siteId,
  sw,
  variant,
}: {
  businessId: string;
  canManage: boolean;
  listingId: string;
  media: WebsiteMedia[];
  onChanged: () => Promise<void>;
  siteId: string;
  sw: boolean;
  variant: WebsiteVariant;
}) {
  const request = useWebsiteRequest();
  const { notify } = useNotification();
  const [price, setPrice] = useState(variant.website_price ?? "");
  const [availability, setAvailability] = useState<WebsiteVariantAvailability>(
    variant.website_availability,
  );
  const [mediaId, setMediaId] = useState(variant.media_id ?? "");
  const [published, setPublished] = useState(variant.is_published);
  const [saving, setSaving] = useState(false);

  async function save() {
    if (!canManage) return;
    setSaving(true);
    try {
      await request((token) =>
        updateWebsiteVariant(
          businessId,
          siteId,
          listingId,
          variant.id,
          {
            is_published: published,
            media_id: mediaId || null,
            website_availability: availability,
            website_price: price.trim() || null,
          },
          token,
        ),
      );
      notify({ message: sw ? "Aina imesasishwa." : "Variant updated.", tone: "success" });
      await onChanged();
    } catch (error) {
      notify({
        message: error instanceof Error ? error.message : sw ? "Imeshindikana kuhifadhi aina." : "Variant could not be saved.",
        tone: "error",
      });
    } finally {
      setSaving(false);
    }
  }

  async function remove() {
    if (!canManage || !window.confirm(sw ? "Futa aina hii?" : "Delete this variant?")) return;
    try {
      await request((token) =>
        deleteWebsiteVariant(businessId, siteId, listingId, variant.id, token),
      );
      notify({ message: sw ? "Aina imefutwa." : "Variant deleted.", tone: "success" });
      await onChanged();
    } catch (error) {
      notify({
        message: error instanceof Error ? error.message : sw ? "Imeshindikana kufuta aina." : "Variant could not be deleted.",
        tone: "error",
      });
    }
  }

  return (
    <div className="grid gap-3 rounded-lg border border-slate-200 p-3 dark:border-slate-800 md:grid-cols-6">
      <div className="md:col-span-2">
        <p className="text-sm font-semibold">{variant.sku || (sw ? "Aina" : "Variant")}</p>
        <p className="mt-1 text-xs text-slate-500">
          {Object.entries(variant.options)
            .map(([key, value]) => `${key}: ${value}`)
            .join(" · ") || (sw ? "Hakuna chaguo" : "No options")}
        </p>
      </div>
      <input
        aria-label={sw ? "Bei" : "Price"}
        className={fieldClassName}
        disabled={!canManage}
        inputMode="decimal"
        onChange={(event) => setPrice(event.target.value)}
        placeholder="0.00"
        value={price}
      />
      <select
        aria-label={sw ? "Upatikanaji" : "Availability"}
        className={fieldClassName}
        disabled={!canManage}
        onChange={(event) => setAvailability(event.target.value as WebsiteVariantAvailability)}
        value={availability}
      >
        <option value="in_stock">{sw ? "Ipo" : "In stock"}</option>
        <option value="low_stock">{sw ? "Imebaki chache" : "Low stock"}</option>
        <option value="out_of_stock">{sw ? "Imeisha" : "Out of stock"}</option>
      </select>
      <select
        aria-label={sw ? "Picha" : "Image"}
        className={fieldClassName}
        disabled={!canManage}
        onChange={(event) => setMediaId(event.target.value)}
        value={mediaId}
      >
        <option value="">{sw ? "Hakuna picha" : "No image"}</option>
        {media.map((item) => (
          <option key={item.id} value={item.id}>
            {item.original_name || item.id}
          </option>
        ))}
      </select>
      <div className="flex items-center justify-end gap-2">
        <label className="flex items-center gap-2 text-xs">
          <input
            checked={published}
            disabled={!canManage}
            onChange={(event) => setPublished(event.target.checked)}
            type="checkbox"
          />
          {sw ? "Imechapishwa" : "Published"}
        </label>
        {canManage ? (
          <>
            <button
              aria-label={sw ? "Hifadhi aina" : "Save variant"}
              className="inline-flex size-8 items-center justify-center rounded-md border border-slate-200 hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-900"
              disabled={saving}
              onClick={() => void save()}
              type="button"
            >
              {saving ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
            </button>
            <button
              aria-label={sw ? "Futa aina" : "Delete variant"}
              className="inline-flex size-8 items-center justify-center rounded-md text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30"
              onClick={() => void remove()}
              type="button"
            >
              <Trash2 className="size-4" />
            </button>
          </>
        ) : null}
      </div>
    </div>
  );
}

function WebsiteProductManager({ businessId }: { businessId: string }) {
  const locale = useLocale();
  const sw = locale === "sw";
  const request = useWebsiteRequest();
  const { notify } = useNotification();
  const { businesses, status: workspaceStatus } = useWorkspace();
  const business = businesses.find((item) => item.id === businessId);
  const canManage = Boolean(business?.membership.permissions.includes("website.manage"));
  const [site, setSite] = useState<WebsiteSite | null>(null);
  const [listings, setListings] = useState<WebsiteListing[]>([]);
  const [media, setMedia] = useState<WebsiteMedia[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [titleEn, setTitleEn] = useState("");
  const [titleSw, setTitleSw] = useState("");
  const [slug, setSlug] = useState("");
  const [brand, setBrand] = useState("");
  const [primaryMediaId, setPrimaryMediaId] = useState("");
  const [creating, setCreating] = useState(false);
  const [variantDrafts, setVariantDrafts] = useState<Record<string, { sku: string; price: string; availability: WebsiteVariantAvailability; options: string; mediaId: string }>>({});

  const copy = useMemo(
    () => ({
      title: sw ? "Bidhaa za tovuti" : "Website products",
      subtitle: sw
        ? "Simamia bidhaa zinazomilikiwa na tovuti bila kutegemea Commerce."
        : "Manage Website-owned products independently from Commerce.",
    }),
    [sw],
  );

  const load = useCallback(
    async (signal?: AbortSignal) => {
      if (workspaceStatus !== "ready") return;
      setLoading(true);
      setError(null);
      try {
        const sitesResponse = await request((token) => getWebsiteSites(businessId, token, signal));
        const activeSite = sitesResponse.data?.sites[0] ?? null;
        setSite(activeSite);
        if (!activeSite) {
          setListings([]);
          setMedia([]);
          return;
        }
        const [listingResponse, mediaResponse] = await Promise.all([
          request((token) => getWebsiteListings(businessId, activeSite.id, token, signal)),
          request((token) => getWebsiteMedia(businessId, activeSite.id, token, signal)),
        ]);
        setListings(listingResponse.data?.listings ?? []);
        setMedia(mediaResponse.data?.media ?? []);
      } catch (loadError) {
        if (signal?.aborted) return;
        setError(loadError instanceof Error ? loadError.message : sw ? "Bidhaa hazijapakiwa." : "Products could not be loaded.");
      } finally {
        if (!signal?.aborted) setLoading(false);
      }
    },
    [businessId, request, sw, workspaceStatus],
  );

  useEffect(() => {
    const controller = new AbortController();
    void load(controller.signal);
    return () => controller.abort();
  }, [load]);

  async function createListing() {
    if (!site || !canManage || !slug.trim() || !titleEn.trim()) return;
    setCreating(true);
    try {
      await request((token) =>
        createWebsiteListing(
          businessId,
          site.id,
          {
            brand: brand.trim(),
            is_published: false,
            primary_media_id: primaryMediaId || null,
            slug: slug.trim(),
            title: { en: titleEn.trim(), sw: titleSw.trim() },
          },
          token,
        ),
      );
      setTitleEn("");
      setTitleSw("");
      setSlug("");
      setBrand("");
      setPrimaryMediaId("");
      notify({ message: sw ? "Bidhaa imeundwa." : "Product created.", tone: "success" });
      await load();
    } catch (createError) {
      notify({ message: createError instanceof Error ? createError.message : sw ? "Bidhaa haijaundwa." : "Product could not be created.", tone: "error" });
    } finally {
      setCreating(false);
    }
  }

  async function toggleListing(listing: WebsiteListing) {
    if (!site || !canManage) return;
    try {
      await request((token) =>
        updateWebsiteListing(
          businessId,
          site.id,
          listing.id,
          { is_published: !listing.is_published },
          token,
        ),
      );
      await load();
    } catch (updateError) {
      notify({ message: updateError instanceof Error ? updateError.message : sw ? "Bidhaa haijasasishwa." : "Product could not be updated.", tone: "error" });
    }
  }

  async function removeListing(listing: WebsiteListing) {
    if (!site || !canManage || !window.confirm(sw ? "Futa bidhaa hii?" : "Delete this product?")) return;
    try {
      await request((token) => deleteWebsiteListing(businessId, site.id, listing.id, token));
      notify({ message: sw ? "Bidhaa imefutwa." : "Product deleted.", tone: "success" });
      await load();
    } catch (deleteError) {
      notify({ message: deleteError instanceof Error ? deleteError.message : sw ? "Bidhaa haijafutwa." : "Product could not be deleted.", tone: "error" });
    }
  }

  function draftFor(listingId: string) {
    return variantDrafts[listingId] ?? {
      availability: "in_stock" as const,
      mediaId: "",
      options: "{}",
      price: "",
      sku: "",
    };
  }

  function updateDraft(listingId: string, changes: Partial<ReturnType<typeof draftFor>>) {
    setVariantDrafts((current) => ({
      ...current,
      [listingId]: { ...draftFor(listingId), ...changes },
    }));
  }

  async function addVariant(listing: WebsiteListing) {
    if (!site || !canManage) return;
    const draft = draftFor(listing.id);
    const options = parseOptions(draft.options);
    if (options === null) {
      notify({ message: sw ? "Chaguo lazima ziwe JSON object yenye maandishi." : "Options must be a JSON object with string values.", tone: "error" });
      return;
    }
    try {
      await request((token) =>
        createWebsiteVariant(
          businessId,
          site.id,
          listing.id,
          {
            currency: "TZS",
            is_published: true,
            media_id: draft.mediaId || null,
            options,
            sku: draft.sku.trim(),
            website_availability: draft.availability,
            website_price: draft.price.trim() || null,
          },
          token,
        ),
      );
      setVariantDrafts((current) => {
        const next = { ...current };
        delete next[listing.id];
        return next;
      });
      notify({ message: sw ? "Aina imeongezwa." : "Variant added.", tone: "success" });
      await load();
    } catch (variantError) {
      notify({ message: variantError instanceof Error ? variantError.message : sw ? "Aina haijaongezwa." : "Variant could not be added.", tone: "error" });
    }
  }

  if (workspaceStatus !== "ready" || loading) {
    return <div className="flex min-h-64 items-center justify-center gap-2 text-sm text-slate-500"><Loader2 className="size-4 animate-spin" />{sw ? "Inapakia bidhaa..." : "Loading products..."}</div>;
  }

  if (error) {
    return <section className="rounded-lg border border-red-200 bg-red-50 p-5 dark:border-red-900 dark:bg-red-950/30"><p className="text-sm text-red-800 dark:text-red-200">{error}</p><Button className="mt-3" onClick={() => void load()} size="small" variant="outline"><RefreshCw className="size-4" />{sw ? "Jaribu tena" : "Try again"}</Button></section>;
  }

  if (!site) {
    return <section className="rounded-lg border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-950"><h1 className="text-lg font-semibold">{copy.title}</h1><p className="mt-2 text-sm text-slate-500">{sw ? "Tovuti haijaundwa bado. Fungua Media kwanza ili kuanzisha tovuti." : "No website exists yet. Open Media first to bootstrap the website."}</p></section>;
  }

  return (
    <div className="space-y-5">
      <header>
        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">Website</p>
        <h1 className="mt-1 text-2xl font-semibold text-slate-950 dark:text-white">{copy.title}</h1>
        <p className="mt-1 text-sm text-slate-500">{copy.subtitle}</p>
      </header>

      {canManage ? (
        <section className="rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-950 sm:p-5">
          <h2 className="text-sm font-semibold">{sw ? "Ongeza bidhaa" : "Add product"}</h2>
          <div className="mt-3 grid gap-3 md:grid-cols-2 xl:grid-cols-5">
            <input className={fieldClassName} onChange={(event) => setTitleEn(event.target.value)} placeholder="English title" value={titleEn} />
            <input className={fieldClassName} onChange={(event) => setTitleSw(event.target.value)} placeholder="Jina la Kiswahili" value={titleSw} />
            <input className={fieldClassName} onChange={(event) => setSlug(event.target.value)} placeholder="slug" value={slug} />
            <input className={fieldClassName} onChange={(event) => setBrand(event.target.value)} placeholder={sw ? "Chapa" : "Brand"} value={brand} />
            <select className={fieldClassName} onChange={(event) => setPrimaryMediaId(event.target.value)} value={primaryMediaId}>
              <option value="">{sw ? "Hakuna picha" : "No primary image"}</option>
              {media.map((item) => <option key={item.id} value={item.id}>{item.original_name || item.id}</option>)}
            </select>
          </div>
          <Button className="mt-3" disabled={creating || !titleEn.trim() || !slug.trim()} onClick={() => void createListing()} size="small"><Plus className="size-4" />{creating ? (sw ? "Inaongeza..." : "Adding...") : (sw ? "Ongeza bidhaa" : "Add product")}</Button>
        </section>
      ) : null}

      <section className="space-y-4">
        {listings.length === 0 ? (
          <div className="rounded-lg border border-dashed border-slate-300 bg-white p-10 text-center text-sm text-slate-500 dark:border-slate-700 dark:bg-slate-950">{sw ? "Hakuna bidhaa za tovuti bado." : "No Website products yet."}</div>
        ) : listings.map((listing) => {
          const draft = draftFor(listing.id);
          return (
            <article className="rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-950 sm:p-5" key={listing.id}>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="font-semibold">{listing.title[locale] || listing.title.en || listing.slug}</h2>
                    <span className="rounded-full bg-slate-100 px-2 py-1 text-[10px] font-semibold uppercase text-slate-500 dark:bg-slate-900">{listing.is_published ? (sw ? "Imechapishwa" : "Published") : (sw ? "Rasimu" : "Draft")}</span>
                  </div>
                  <p className="mt-1 text-xs text-slate-500">/{listing.slug}{listing.brand ? ` · ${listing.brand}` : ""}</p>
                </div>
                {canManage ? (
                  <div className="flex gap-2">
                    <Button onClick={() => void toggleListing(listing)} size="small" variant="outline">{listing.is_published ? (sw ? "Rudisha rasimu" : "Unpublish") : (sw ? "Chapisha" : "Publish")}</Button>
                    <button aria-label={sw ? "Futa bidhaa" : "Delete product"} className="inline-flex size-9 items-center justify-center rounded-lg text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30" onClick={() => void removeListing(listing)} type="button"><Trash2 className="size-4" /></button>
                  </div>
                ) : null}
              </div>

              <div className="mt-4 space-y-2">
                {listing.variants.map((variant) => (
                  <VariantEditor businessId={businessId} canManage={canManage} key={variant.id} listingId={listing.id} media={media} onChanged={load} siteId={site.id} sw={sw} variant={variant} />
                ))}
              </div>

              {canManage ? (
                <div className="mt-4 rounded-lg bg-slate-50 p-3 dark:bg-slate-900/50">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{sw ? "Ongeza aina kamili" : "Add exact variant"}</p>
                  <div className="mt-2 grid gap-2 md:grid-cols-2 xl:grid-cols-5">
                    <input className={fieldClassName} onChange={(event) => updateDraft(listing.id, { sku: event.target.value })} placeholder="SKU" value={draft.sku} />
                    <input className={fieldClassName} inputMode="decimal" onChange={(event) => updateDraft(listing.id, { price: event.target.value })} placeholder={sw ? "Bei TZS" : "Price TZS"} value={draft.price} />
                    <select className={fieldClassName} onChange={(event) => updateDraft(listing.id, { availability: event.target.value as WebsiteVariantAvailability })} value={draft.availability}><option value="in_stock">{sw ? "Ipo" : "In stock"}</option><option value="low_stock">{sw ? "Imebaki chache" : "Low stock"}</option><option value="out_of_stock">{sw ? "Imeisha" : "Out of stock"}</option></select>
                    <input className={fieldClassName} onChange={(event) => updateDraft(listing.id, { options: event.target.value })} placeholder='{"color":"Blue","storage":"256GB"}' value={draft.options} />
                    <select className={fieldClassName} onChange={(event) => updateDraft(listing.id, { mediaId: event.target.value })} value={draft.mediaId}><option value="">{sw ? "Hakuna picha" : "No image"}</option>{media.map((item) => <option key={item.id} value={item.id}>{item.original_name || item.id}</option>)}</select>
                  </div>
                  <Button className="mt-2" onClick={() => void addVariant(listing)} size="small"><Plus className="size-4" />{sw ? "Ongeza aina" : "Add variant"}</Button>
                </div>
              ) : null}
            </article>
          );
        })}
      </section>
    </div>
  );
}

export { WebsiteProductManager };
