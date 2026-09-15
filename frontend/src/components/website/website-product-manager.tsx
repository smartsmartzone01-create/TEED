"use client";

import {
  ChevronDown,
  ChevronUp,
  Images,
  Loader2,
  Plus,
  RefreshCw,
  Save,
  Trash2,
  Upload,
  X,
} from "lucide-react";
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
  uploadWebsiteMedia,
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

function MediaThumbnail({
  item,
  onRemove,
  order,
}: {
  item: WebsiteMedia;
  onRemove?: () => void;
  order?: number;
}) {
  return (
    <div className="relative size-16 overflow-hidden rounded-lg border border-slate-200 bg-slate-100 dark:border-slate-800 dark:bg-slate-900">
      <span
        aria-label={item.original_name || "Website image"}
        className="block size-full bg-cover bg-center"
        role="img"
        style={{ backgroundImage: `url("${item.public_url}")` }}
      />
      {order ? (
        <span className="absolute left-1 top-1 rounded-full bg-slate-950 px-1.5 py-0.5 text-[10px] font-bold text-white dark:bg-white dark:text-slate-950">
          {order}
        </span>
      ) : null}
      {onRemove ? (
        <button
          aria-label="Remove image"
          className="absolute right-1 top-1 inline-flex size-5 items-center justify-center rounded-full bg-white/95 text-slate-700 shadow-sm hover:bg-white"
          onClick={onRemove}
          type="button"
        >
          <X className="size-3" />
        </button>
      ) : null}
    </div>
  );
}

function MediaPicker({
  canManage,
  label,
  media,
  onUpload,
  selectedIds,
  setSelectedIds,
  single = false,
  sw,
}: {
  canManage: boolean;
  label: string;
  media: WebsiteMedia[];
  onUpload: (file: File) => Promise<string | null>;
  selectedIds: string[];
  setSelectedIds: (ids: string[]) => void;
  single?: boolean;
  sw: boolean;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [galleryOpen, setGalleryOpen] = useState(false);
  const [uploading, setUploading] = useState(false);

  const selectedMedia = selectedIds
    .map((id) => media.find((item) => item.id === id))
    .filter((item): item is WebsiteMedia => Boolean(item));

  function toggle(id: string) {
    if (!canManage) return;
    if (single) {
      setSelectedIds(selectedIds.includes(id) ? [] : [id]);
      return;
    }
    setSelectedIds(
      selectedIds.includes(id)
        ? selectedIds.filter((item) => item !== id)
        : [...selectedIds, id],
    );
  }

  async function upload(file: File) {
    if (!canManage) return;
    setUploading(true);
    try {
      const id = await onUpload(file);
      if (id) {
        setSelectedIds(single ? [id] : [...selectedIds.filter((item) => item !== id), id]);
        setMenuOpen(false);
      }
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p>
        {canManage ? (
          <button
            className="inline-flex h-8 items-center gap-1.5 rounded-md border border-slate-200 px-2.5 text-xs font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-800 dark:text-slate-200 dark:hover:bg-slate-900"
            onClick={() => setMenuOpen((current) => !current)}
            type="button"
          >
            <Plus className="size-3.5" />
            {sw ? "Ongeza picha" : "Add images"}
            {menuOpen ? <ChevronUp className="size-3.5" /> : <ChevronDown className="size-3.5" />}
          </button>
        ) : null}
      </div>

      {selectedMedia.length ? (
        <div className="flex flex-wrap gap-2">
          {selectedMedia.map((item, index) => (
            <MediaThumbnail
              item={item}
              key={item.id}
              onRemove={
                canManage
                  ? () => setSelectedIds(selectedIds.filter((id) => id !== item.id))
                  : undefined
              }
              order={single ? undefined : index + 1}
            />
          ))}
        </div>
      ) : (
        <p className="text-xs text-slate-400">
          {sw ? "Hakuna picha zilizochaguliwa." : "No images selected."}
        </p>
      )}

      {menuOpen ? (
        <div className="flex flex-wrap gap-2 rounded-md border border-slate-200 bg-slate-50 p-2 dark:border-slate-800 dark:bg-slate-900/60">
          <label className={`inline-flex h-9 cursor-pointer items-center gap-2 rounded-md border border-slate-200 bg-white px-3 text-xs font-medium dark:border-slate-700 dark:bg-slate-950 ${uploading ? "pointer-events-none opacity-60" : ""}`}>
            {uploading ? <Loader2 className="size-4 animate-spin" /> : <Upload className="size-4" />}
            {sw ? "Pakia mpya" : "Upload new"}
            <input
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              disabled={uploading}
              onChange={(event) => {
                const input = event.currentTarget;
                const file = input.files?.[0];
                if (file) void upload(file).finally(() => { input.value = ""; });
              }}
              type="file"
            />
          </label>
          <button
            className="inline-flex h-9 items-center gap-2 rounded-md border border-slate-200 bg-white px-3 text-xs font-medium dark:border-slate-700 dark:bg-slate-950"
            onClick={() => {
              setGalleryOpen((current) => !current);
              setMenuOpen(false);
            }}
            type="button"
          >
            <Images className="size-4" />
            {sw ? "Chagua kwenye galari" : "Choose from gallery"}
          </button>
        </div>
      ) : null}

      {galleryOpen ? (
        <div className="rounded-lg border border-slate-200 p-3 dark:border-slate-800">
          <div className="mb-2 flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold text-slate-700 dark:text-slate-200">
                {sw ? "Galari ya Website" : "Website gallery"}
              </p>
              {!single ? (
                <p className="mt-0.5 text-[11px] text-slate-400">
                  {sw ? "Mpangilio wa kuchagua ndio mpangilio wa thumbnails." : "Selection order becomes thumbnail order."}
                </p>
              ) : null}
            </div>
            <Button onClick={() => setGalleryOpen(false)} size="small" type="button" variant="ghost">
              {sw ? "Funga" : "Done"}
            </Button>
          </div>
          {media.length ? (
            <div className="grid max-h-64 grid-cols-3 gap-2 overflow-y-auto pr-1 sm:grid-cols-5 md:grid-cols-7 lg:grid-cols-9">
              {media.map((item) => {
                const selectedIndex = selectedIds.indexOf(item.id);
                const selected = selectedIndex >= 0;
                return (
                  <button
                    className={`relative aspect-square overflow-hidden rounded-lg border p-1 ${selected ? "border-slate-950 ring-1 ring-slate-950 dark:border-white dark:ring-white" : "border-slate-200 dark:border-slate-800"}`}
                    key={item.id}
                    onClick={() => toggle(item.id)}
                    title={item.original_name || item.id}
                    type="button"
                  >
                    <span
                      aria-label={item.original_name || "Website image"}
                      className="block size-full rounded-md bg-cover bg-center"
                      role="img"
                      style={{ backgroundImage: `url("${item.public_url}")` }}
                    />
                    {selected && !single ? (
                      <span className="absolute right-1 top-1 rounded-full bg-slate-950 px-1.5 py-0.5 text-[10px] font-bold text-white dark:bg-white dark:text-slate-950">
                        {selectedIndex + 1}
                      </span>
                    ) : null}
                  </button>
                );
              })}
            </div>
          ) : (
            <p className="text-xs text-slate-400">
              {sw ? "Galari bado halina picha. Tumia Pakia mpya." : "The gallery is empty. Use Upload new."}
            </p>
          )}
        </div>
      ) : null}
    </div>
  );
}

function VariantEditor({
  businessId,
  canManage,
  listingId,
  media,
  onChanged,
  onUpload,
  siteId,
  sw,
  variant,
}: {
  businessId: string;
  canManage: boolean;
  listingId: string;
  media: WebsiteMedia[];
  onChanged: () => Promise<void>;
  onUpload: (file: File) => Promise<string | null>;
  siteId: string;
  sw: boolean;
  variant: WebsiteVariant;
}) {
  const request = useWebsiteRequest();
  const { notify } = useNotification();
  const [price, setPrice] = useState(variant.website_price ?? "");
  const [availability, setAvailability] = useState<WebsiteVariantAvailability>(variant.website_availability);
  const [galleryMediaIds, setGalleryMediaIds] = useState<string[]>(variant.gallery_media_ids);
  const [published, setPublished] = useState(variant.is_published);
  const [saving, setSaving] = useState(false);

  const commerceOrigin = Boolean(variant.commerce_product_id);
  const commerceConnected = !commerceOrigin || variant.commerce_connected;
  const canPublish = canManage && commerceConnected;

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
            gallery_media_ids: galleryMediaIds,
            is_published: commerceConnected ? published : false,
            website_availability: availability,
            website_price: price.trim() || null,
          },
          token,
        ),
      );
      notify({ message: sw ? "SKU imesasishwa." : "SKU updated.", tone: "success" });
      await onChanged();
    } catch (error) {
      notify({
        message:
          error instanceof Error
            ? error.message
            : sw
              ? "Imeshindikana kuhifadhi SKU."
              : "SKU could not be saved.",
        tone: "error",
      });
    } finally {
      setSaving(false);
    }
  }

  async function remove() {
    if (
      !canManage ||
      commerceOrigin ||
      !window.confirm(sw ? "Futa SKU hii ya Website?" : "Delete this Website SKU?")
    ) {
      return;
    }
    try {
      await request((token) =>
        deleteWebsiteVariant(businessId, siteId, listingId, variant.id, token),
      );
      notify({ message: sw ? "SKU imefutwa." : "Website SKU deleted.", tone: "success" });
      await onChanged();
    } catch (error) {
      notify({
        message:
          error instanceof Error
            ? error.message
            : sw
              ? "Imeshindikana kufuta SKU."
              : "Website SKU could not be deleted.",
        tone: "error",
      });
    }
  }

  return (
    <div className="grid gap-3 rounded-lg border border-slate-200 p-3 dark:border-slate-800 md:grid-cols-6">
      <div className="md:col-span-2">
        <p className="text-sm font-semibold">{variant.sku}</p>
        <p className="mt-1 text-xs text-slate-500">
          {Object.entries(variant.options)
            .map(([key, value]) => `${key}: ${value}`)
            .join(" · ") || (sw ? "Hakuna chaguo" : "No options")}
        </p>
        <p className="mt-1 text-[11px] text-slate-400">
          {commerceOrigin
            ? commerceConnected
              ? sw
                ? "Imeunganishwa na Commerce"
                : "Commerce linked"
              : sw
                ? "Imeondolewa kwenye Website"
                : "Removed from Website"
            : sw
              ? "SKU ya Website"
              : "Website SKU"}
        </p>
      </div>

      <input
        aria-label={sw ? "Bei ya Website" : "Website price"}
        className={fieldClassName}
        disabled={!canManage}
        inputMode="decimal"
        onChange={(event) => setPrice(event.target.value)}
        placeholder={sw ? "Bei TZS" : "Price TZS"}
        value={price}
      />

      {commerceOrigin ? (
        <div className="flex h-10 items-center rounded-lg border border-slate-200 px-3 text-xs text-slate-500 dark:border-slate-800">
          {commerceConnected
            ? sw
              ? "Upatikanaji kutoka Commerce"
              : "Availability from Commerce"
            : sw
              ? "Haijaunganishwa"
              : "Not connected"}
        </div>
      ) : (
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
      )}

      <div className="flex items-center gap-2 md:col-span-2 md:justify-end">
        <label className="flex items-center gap-2 text-xs">
          <input
            checked={commerceConnected && published}
            disabled={!canPublish}
            onChange={(event) => setPublished(event.target.checked)}
            type="checkbox"
          />
          {sw ? "Imechapishwa" : "Published"}
        </label>
        {canManage ? (
          <>
            <button
              aria-label={sw ? "Hifadhi SKU" : "Save SKU"}
              className="inline-flex size-8 items-center justify-center rounded-md border border-slate-200 hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-900"
              disabled={saving}
              onClick={() => void save()}
              type="button"
            >
              {saving ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
            </button>
            {!commerceOrigin ? (
              <button
                aria-label={sw ? "Futa SKU" : "Delete Website SKU"}
                className="inline-flex size-8 items-center justify-center rounded-md text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30"
                onClick={() => void remove()}
                type="button"
              >
                <Trash2 className="size-4" />
              </button>
            ) : null}
          </>
        ) : null}
      </div>

      <div className="md:col-span-6">
        <MediaPicker
          canManage={canManage}
          label={sw ? "Picha za SKU" : "SKU images"}
          media={media}
          onUpload={onUpload}
          selectedIds={galleryMediaIds}
          setSelectedIds={setGalleryMediaIds}
          sw={sw}
        />
      </div>
    </div>
  );
}

type VariantDraft = {
  price: string;
  availability: WebsiteVariantAvailability;
  options: string;
  galleryMediaIds: string[];
};

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

  const [variantDrafts, setVariantDrafts] = useState<Record<string, VariantDraft>>({});
  const [openWebsiteSkuForms, setOpenWebsiteSkuForms] = useState<Record<string, boolean>>({});

  const copy = useMemo(
    () => ({
      title: sw ? "Bidhaa za tovuti" : "Website products",
      subtitle: sw
        ? "Simamia uchapishaji, bei na picha za bidhaa zilizounganishwa au SKU za Website."
        : "Manage publishing, prices, and images for connected products and Website-owned SKUs.",
    }),
    [sw],
  );

  const load = useCallback(
    async (signal?: AbortSignal) => {
      if (workspaceStatus !== "ready") return;
      setLoading(true);
      setError(null);
      try {
        const sitesResponse = await request((token) =>
          getWebsiteSites(businessId, token, signal),
        );
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
        setError(
          loadError instanceof Error
            ? loadError.message
            : sw
              ? "Bidhaa hazijapakiwa."
              : "Products could not be loaded.",
        );
      } finally {
        if (!signal?.aborted) setLoading(false);
      }
    },
    [businessId, request, sw, workspaceStatus],
  );

  useEffect(() => {
    const controller = new AbortController();
    const initialLoad = window.setTimeout(() => void load(controller.signal), 0);
    return () => {
      window.clearTimeout(initialLoad);
      controller.abort();
    };
  }, [load]);

  async function uploadMedia(file: File): Promise<string | null> {
    if (!site || !canManage) return null;
    try {
      const response = await request((token) =>
        uploadWebsiteMedia(
          businessId,
          site.id,
          file,
          { en: file.name, sw: file.name },
          token,
        ),
      );
      const uploaded = response.data ?? null;
      if (!uploaded) return null;
      setMedia((current) => [
        ...current.filter((item) => item.id !== uploaded.id),
        uploaded,
      ]);
      notify({ message: sw ? "Picha imepakiwa." : "Image uploaded.", tone: "success" });
      return uploaded.id;
    } catch (uploadError) {
      notify({
        message:
          uploadError instanceof Error
            ? uploadError.message
            : sw
              ? "Picha haijapakiwa."
              : "Image could not be uploaded.",
        tone: "error",
      });
      return null;
    }
  }

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
      notify({ message: sw ? "Bidhaa imeundwa kama rasimu." : "Product created as a draft.", tone: "success" });
      await load();
    } catch (createError) {
      notify({
        message:
          createError instanceof Error
            ? createError.message
            : sw
              ? "Bidhaa haijaundwa."
              : "Product could not be created.",
        tone: "error",
      });
    } finally {
      setCreating(false);
    }
  }

  async function toggleListing(listing: WebsiteListing) {
    if (!site || !canManage) return;
    const publishable = listing.variants.some(
      (variant) => !variant.commerce_product_id || variant.commerce_connected,
    );
    if (!listing.is_published && !publishable) {
      notify({
        message: sw
          ? "Unganisha angalau SKU moja kabla ya kuchapisha bidhaa hii."
          : "Connect at least one SKU before publishing this product.",
        tone: "error",
      });
      return;
    }
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
  }

  async function removeListing(listing: WebsiteListing) {
    if (
      !site ||
      !canManage ||
      !window.confirm(sw ? "Futa bidhaa hii?" : "Delete this product?")
    ) {
      return;
    }
    await request((token) =>
      deleteWebsiteListing(businessId, site.id, listing.id, token),
    );
    await load();
  }

  function draftFor(listingId: string): VariantDraft {
    return (
      variantDrafts[listingId] ?? {
        availability: "in_stock",
        galleryMediaIds: [],
        options: "{}",
        price: "",
      }
    );
  }

  function updateDraft(listingId: string, changes: Partial<VariantDraft>) {
    setVariantDrafts((current) => ({
      ...current,
      [listingId]: { ...draftFor(listingId), ...changes },
    }));
  }

  async function addWebsiteSku(listing: WebsiteListing) {
    if (!site || !canManage) return;
    const draft = draftFor(listing.id);
    const options = parseOptions(draft.options);
    if (options === null) {
      notify({
        message: sw
          ? "Chaguo lazima ziwe JSON object yenye maandishi."
          : "Options must be a JSON object with string values.",
        tone: "error",
      });
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
            gallery_media_ids: draft.galleryMediaIds,
            is_published: false,
            options,
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
      setOpenWebsiteSkuForms((current) => ({ ...current, [listing.id]: false }));
      notify({
        message: sw
          ? "SKU ya Website imeundwa kama rasimu."
          : "Website SKU created as a draft.",
        tone: "success",
      });
      await load();
    } catch (createError) {
      notify({
        message:
          createError instanceof Error
            ? createError.message
            : sw
              ? "SKU haijaundwa."
              : "Website SKU could not be created.",
        tone: "error",
      });
    }
  }

  if (workspaceStatus !== "ready" || loading) {
    return (
      <div className="flex min-h-64 items-center justify-center gap-2 text-sm text-slate-500">
        <Loader2 className="size-4 animate-spin" />
        {sw ? "Inapakia bidhaa..." : "Loading products..."}
      </div>
    );
  }

  if (error) {
    return (
      <section className="rounded-lg border border-red-200 bg-red-50 p-5 dark:border-red-900 dark:bg-red-950/30">
        <p className="text-sm text-red-800 dark:text-red-200">{error}</p>
        <Button className="mt-3" onClick={() => void load()} size="small" variant="outline">
          <RefreshCw className="size-4" />
          {sw ? "Jaribu tena" : "Try again"}
        </Button>
      </section>
    );
  }

  if (!site) {
    return (
      <section className="rounded-lg border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-950">
        <h1 className="text-lg font-semibold">{copy.title}</h1>
        <p className="mt-2 text-sm text-slate-500">
          {sw
            ? "Tovuti haijaundwa bado. Fungua Media kwanza ili kuanzisha tovuti."
            : "No website exists yet. Open Media first to bootstrap the website."}
        </p>
      </section>
    );
  }

  return (
    <div className="space-y-5">
      <header>
        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">
          Website
        </p>
        <h1 className="mt-1 text-2xl font-semibold text-slate-950 dark:text-white">
          {copy.title}
        </h1>
        <p className="mt-1 text-sm text-slate-500">{copy.subtitle}</p>
      </header>

      {canManage ? (
        <section className="rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-950 sm:p-5">
          <h2 className="text-sm font-semibold">{sw ? "Ongeza bidhaa ya Website" : "Add Website product"}</h2>
          <p className="mt-1 text-xs text-slate-500">
            {sw
              ? "Unda bidhaa binafsi au familia ya Website. SKU zinaongezwa ndani yake na kutengenezwa kiotomatiki."
              : "Create a standalone Website product or family. Its Website SKUs are added inside and generated automatically."}
          </p>
          <div className="mt-3 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <input className={fieldClassName} onChange={(event) => setTitleEn(event.target.value)} placeholder="English title" value={titleEn} />
            <input className={fieldClassName} onChange={(event) => setTitleSw(event.target.value)} placeholder="Jina la Kiswahili" value={titleSw} />
            <input className={fieldClassName} onChange={(event) => setSlug(event.target.value)} placeholder="slug" value={slug} />
            <input className={fieldClassName} onChange={(event) => setBrand(event.target.value)} placeholder={sw ? "Chapa" : "Brand"} value={brand} />
          </div>
          <div className="mt-3 max-w-xl">
            <MediaPicker
              canManage
              label={sw ? "Picha kuu ya bidhaa" : "Product cover"}
              media={media}
              onUpload={uploadMedia}
              selectedIds={primaryMediaId ? [primaryMediaId] : []}
              setSelectedIds={(ids) => setPrimaryMediaId(ids[0] ?? "")}
              single
              sw={sw}
            />
          </div>
          <Button
            className="mt-3"
            disabled={creating || !titleEn.trim() || !slug.trim()}
            onClick={() => void createListing()}
            size="small"
          >
            <Plus className="size-4" />
            {creating ? (sw ? "Inaongeza..." : "Adding...") : sw ? "Ongeza bidhaa" : "Add product"}
          </Button>
        </section>
      ) : null}

      <section className="space-y-4">
        {listings.length === 0 ? (
          <div className="rounded-lg border border-dashed border-slate-300 bg-white p-10 text-center text-sm text-slate-500 dark:border-slate-700 dark:bg-slate-950">
            {sw ? "Hakuna bidhaa za tovuti bado." : "No Website products yet."}
          </div>
        ) : (
          listings.map((listing) => {
            const draft = draftFor(listing.id);
            const skuFormOpen = Boolean(openWebsiteSkuForms[listing.id]);
            return (
              <article
                className="rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-950 sm:p-5"
                key={listing.id}
              >
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <h2 className="font-semibold">
                      {listing.title[locale] || listing.title.en || listing.slug}
                    </h2>
                    <p className="mt-1 text-xs text-slate-500">
                      /{listing.slug}
                      {listing.brand ? ` · ${listing.brand}` : ""}
                      {listing.variants.length ? ` · ${listing.variants.length} SKU` : ""}
                    </p>
                  </div>
                  {canManage ? (
                    <div className="flex gap-2">
                      <Button
                        onClick={() => void toggleListing(listing)}
                        size="small"
                        variant="outline"
                      >
                        {listing.is_published
                          ? sw
                            ? "Rudisha rasimu"
                            : "Unpublish"
                          : sw
                            ? "Chapisha"
                            : "Publish"}
                      </Button>
                      <button
                        aria-label={sw ? "Futa bidhaa" : "Delete product"}
                        className="inline-flex size-9 items-center justify-center rounded-lg text-red-500 hover:bg-red-50"
                        onClick={() => void removeListing(listing)}
                        type="button"
                      >
                        <Trash2 className="size-4" />
                      </button>
                    </div>
                  ) : null}
                </div>

                <div className="mt-4 space-y-2">
                  {listing.variants.map((variant) => (
                    <VariantEditor
                      businessId={businessId}
                      canManage={canManage}
                      key={variant.id}
                      listingId={listing.id}
                      media={media}
                      onChanged={load}
                      onUpload={uploadMedia}
                      siteId={site.id}
                      sw={sw}
                      variant={variant}
                    />
                  ))}
                </div>

                {canManage ? (
                  <div className="mt-4">
                    <Button
                      onClick={() =>
                        setOpenWebsiteSkuForms((current) => ({
                          ...current,
                          [listing.id]: !skuFormOpen,
                        }))
                      }
                      size="small"
                      variant="outline"
                    >
                      <Plus className="size-4" />
                      {sw ? "Ongeza SKU ya Website" : "Add Website SKU"}
                    </Button>

                    {skuFormOpen ? (
                      <div className="mt-3 rounded-lg bg-slate-50 p-3 dark:bg-slate-900/50">
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div>
                            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                              {sw ? "SKU mpya ya Website" : "New Website SKU"}
                            </p>
                            <p className="mt-1 text-[11px] text-slate-400">
                              {sw
                                ? "Nambari ya SKU itatengenezwa kiotomatiki na Website. SKU mpya inaanza kama rasimu."
                                : "The Website generates the SKU automatically. New Website SKUs start as drafts."}
                            </p>
                          </div>
                          <button
                            aria-label={sw ? "Funga" : "Close"}
                            className="inline-flex size-8 items-center justify-center rounded-md text-slate-500 hover:bg-slate-200/60 dark:hover:bg-slate-800"
                            onClick={() =>
                              setOpenWebsiteSkuForms((current) => ({
                                ...current,
                                [listing.id]: false,
                              }))
                            }
                            type="button"
                          >
                            <X className="size-4" />
                          </button>
                        </div>

                        <div className="mt-3 grid gap-2 md:grid-cols-3">
                          <input
                            className={fieldClassName}
                            inputMode="decimal"
                            onChange={(event) =>
                              updateDraft(listing.id, { price: event.target.value })
                            }
                            placeholder={sw ? "Bei TZS" : "Price TZS"}
                            value={draft.price}
                          />
                          <select
                            className={fieldClassName}
                            onChange={(event) =>
                              updateDraft(listing.id, {
                                availability: event.target.value as WebsiteVariantAvailability,
                              })
                            }
                            value={draft.availability}
                          >
                            <option value="in_stock">{sw ? "Ipo" : "In stock"}</option>
                            <option value="low_stock">{sw ? "Imebaki chache" : "Low stock"}</option>
                            <option value="out_of_stock">{sw ? "Imeisha" : "Out of stock"}</option>
                          </select>
                          <input
                            className={fieldClassName}
                            onChange={(event) =>
                              updateDraft(listing.id, { options: event.target.value })
                            }
                            placeholder='{"color":"Blue","storage":"256GB"}'
                            value={draft.options}
                          />
                        </div>

                        <div className="mt-3">
                          <MediaPicker
                            canManage
                            label={sw ? "Picha za SKU" : "SKU images"}
                            media={media}
                            onUpload={uploadMedia}
                            selectedIds={draft.galleryMediaIds}
                            setSelectedIds={(ids) =>
                              updateDraft(listing.id, { galleryMediaIds: ids })
                            }
                            sw={sw}
                          />
                        </div>

                        <Button
                          className="mt-3"
                          onClick={() => void addWebsiteSku(listing)}
                          size="small"
                        >
                          <Plus className="size-4" />
                          {sw ? "Unda SKU ya Website" : "Create Website SKU"}
                        </Button>
                      </div>
                    ) : null}
                  </div>
                ) : null}
              </article>
            );
          })
        )}
      </section>
    </div>
  );
}

export { WebsiteProductManager };
