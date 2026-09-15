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

type OptionDraft = {
  id: string;
  name: string;
  value: string;
};

type VariantDraft = {
  price: string;
  availability: WebsiteVariantAvailability;
  optionRows: OptionDraft[];
  galleryMediaIds: string[];
};

type CreationKind = "standalone" | "family";

function optionId() {
  return Math.random().toString(36).slice(2, 10);
}

function emptyOption(): OptionDraft {
  return { id: optionId(), name: "", value: "" };
}

function emptyVariantDraft(withOption = false): VariantDraft {
  return {
    availability: "in_stock",
    galleryMediaIds: [],
    optionRows: withOption ? [emptyOption()] : [],
    price: "",
  };
}

function optionKey(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function optionsFromRows(rows: OptionDraft[], requireOption: boolean, sw: boolean) {
  const nonEmpty = rows.filter((row) => row.name.trim() || row.value.trim());
  if (requireOption && nonEmpty.length === 0) {
    return {
      error: sw
        ? "Ongeza angalau chaguo moja la SKU, kwa mfano Rangi au Ukubwa."
        : "Add at least one SKU option, such as Color or Size.",
      options: null,
    };
  }
  if (nonEmpty.some((row) => !row.name.trim() || !row.value.trim())) {
    return {
      error: sw
        ? "Jaza jina na thamani ya kila chaguo."
        : "Complete both the option name and option value.",
      options: null,
    };
  }

  const entries = nonEmpty.map((row) => [optionKey(row.name), row.value.trim()] as const);
  if (entries.some(([key]) => !key)) {
    return {
      error: sw ? "Weka jina sahihi la chaguo." : "Enter a valid option name.",
      options: null,
    };
  }
  if (new Set(entries.map(([key]) => key)).size !== entries.length) {
    return {
      error: sw
        ? "Jina la chaguo lisitumike zaidi ya mara moja kwenye SKU moja."
        : "Use each option name only once on a SKU.",
      options: null,
    };
  }
  return { error: null, options: Object.fromEntries(entries) as Record<string, string> };
}

function automaticSlug(title: string, listings: WebsiteListing[]) {
  const base =
    title
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "product";
  const used = new Set(listings.map((listing) => listing.slug));
  if (!used.has(base)) return base;
  let suffix = 2;
  while (used.has(`${base}-${suffix}`)) suffix += 1;
  return `${base}-${suffix}`;
}

function MediaThumbnail({ item, onRemove, order }: { item: WebsiteMedia; onRemove?: () => void; order?: number }) {
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

function MediaPicker({ canManage, label, media, onUpload, selectedIds, setSelectedIds, single = false, sw }: {
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
              onRemove={canManage ? () => setSelectedIds(selectedIds.filter((id) => id !== item.id)) : undefined}
              order={single ? undefined : index + 1}
            />
          ))}
        </div>
      ) : (
        <p className="text-xs text-slate-400">{sw ? "Hakuna picha zilizochaguliwa." : "No images selected."}</p>
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
              <p className="text-xs font-semibold text-slate-700 dark:text-slate-200">{sw ? "Galari ya Website" : "Website gallery"}</p>
              {!single ? (
                <p className="mt-0.5 text-[11px] text-slate-400">{sw ? "Mpangilio wa kuchagua ndio mpangilio wa thumbnails." : "Selection order becomes thumbnail order."}</p>
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
            <p className="text-xs text-slate-400">{sw ? "Galari bado halina picha. Tumia Pakia mpya." : "The gallery is empty. Use Upload new."}</p>
          )}
        </div>
      ) : null}
    </div>
  );
}

function OptionRows({ rows, onChange, sw }: { rows: OptionDraft[]; onChange: (rows: OptionDraft[]) => void; sw: boolean }) {
  function update(id: string, changes: Partial<OptionDraft>) {
    onChange(rows.map((row) => (row.id === id ? { ...row, ...changes } : row)));
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{sw ? "Chaguo za SKU" : "SKU options"}</p>
          <p className="mt-0.5 text-[11px] text-slate-400">{sw ? "Mfano: Rangi — Nyeupe, Hifadhi — 256 GB." : "For example: Color — White, Storage — 256 GB."}</p>
        </div>
        <Button onClick={() => onChange([...rows, emptyOption()])} size="small" type="button" variant="outline">
          <Plus className="size-3.5" />
          {sw ? "Ongeza chaguo" : "Add option"}
        </Button>
      </div>
      {rows.length === 0 ? (
        <p className="rounded-md border border-dashed border-slate-300 p-3 text-xs text-slate-500 dark:border-slate-700">
          {sw ? "Hakuna chaguo bado." : "No options yet."}
        </p>
      ) : (
        rows.map((row) => (
          <div className="grid gap-2 sm:grid-cols-[1fr_1fr_auto]" key={row.id}>
            <input
              className={fieldClassName}
              onChange={(event) => update(row.id, { name: event.target.value })}
              placeholder={sw ? "Jina, mfano Rangi" : "Name, e.g. Color"}
              value={row.name}
            />
            <input
              className={fieldClassName}
              onChange={(event) => update(row.id, { value: event.target.value })}
              placeholder={sw ? "Thamani, mfano Nyeupe" : "Value, e.g. White"}
              value={row.value}
            />
            <button
              aria-label={sw ? "Ondoa chaguo" : "Remove option"}
              className="inline-flex size-10 items-center justify-center rounded-md text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30"
              onClick={() => onChange(rows.filter((item) => item.id !== row.id))}
              type="button"
            >
              <Trash2 className="size-4" />
            </button>
          </div>
        ))
      )}
    </div>
  );
}

function DraftSkuEditor({ draft, familyMode, media, onChange, onRemove, onUpload, sw, title }: {
  draft: VariantDraft;
  familyMode: boolean;
  media: WebsiteMedia[];
  onChange: (draft: VariantDraft) => void;
  onRemove?: () => void;
  onUpload: (file: File) => Promise<string | null>;
  sw: boolean;
  title: string;
}) {
  return (
    <div className="rounded-lg border border-slate-200 p-3 dark:border-slate-800">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-semibold">{title}</p>
        {onRemove ? (
          <button aria-label={sw ? "Ondoa SKU" : "Remove SKU"} className="text-red-500" onClick={onRemove} type="button">
            <Trash2 className="size-4" />
          </button>
        ) : null}
      </div>
      <div className="mt-3 grid gap-2 md:grid-cols-2">
        <input
          className={fieldClassName}
          inputMode="decimal"
          onChange={(event) => onChange({ ...draft, price: event.target.value })}
          placeholder={sw ? "Bei TZS" : "Price TZS"}
          value={draft.price}
        />
        <select
          className={fieldClassName}
          onChange={(event) => onChange({ ...draft, availability: event.target.value as WebsiteVariantAvailability })}
          value={draft.availability}
        >
          <option value="in_stock">{sw ? "Ipo" : "In stock"}</option>
          <option value="low_stock">{sw ? "Imebaki chache" : "Low stock"}</option>
          <option value="out_of_stock">{sw ? "Imeisha" : "Out of stock"}</option>
        </select>
      </div>
      {familyMode ? (
        <div className="mt-3">
          <OptionRows rows={draft.optionRows} onChange={(optionRows) => onChange({ ...draft, optionRows })} sw={sw} />
        </div>
      ) : null}
      <div className="mt-3">
        <MediaPicker
          canManage
          label={sw ? "Picha za SKU" : "SKU images"}
          media={media}
          onUpload={onUpload}
          selectedIds={draft.galleryMediaIds}
          setSelectedIds={(galleryMediaIds) => onChange({ ...draft, galleryMediaIds })}
          sw={sw}
        />
      </div>
    </div>
  );
}

function ShowcaseEditor({ businessId, canManage, listing, media, onChanged, onUpload, siteId, sw }: {
  businessId: string;
  canManage: boolean;
  listing: WebsiteListing;
  media: WebsiteMedia[];
  onChanged: () => Promise<void>;
  onUpload: (file: File) => Promise<string | null>;
  siteId: string;
  sw: boolean;
}) {
  const request = useWebsiteRequest();
  const { notify } = useNotification();
  const [mediaId, setMediaId] = useState(listing.primary_media_id ?? "");
  const [saving, setSaving] = useState(false);

  useEffect(() => setMediaId(listing.primary_media_id ?? ""), [listing.primary_media_id]);
  const dirty = mediaId !== (listing.primary_media_id ?? "");

  async function save() {
    if (!canManage || !dirty) return;
    setSaving(true);
    try {
      await request((token) => updateWebsiteListing(businessId, siteId, listing.id, { primary_media_id: mediaId || null }, token));
      notify({ message: sw ? "Picha ya kuonyesha bidhaa imehifadhiwa." : "Product showcase image saved.", tone: "success" });
      await onChanged();
    } catch (error) {
      notify({ message: error instanceof Error ? error.message : sw ? "Picha haijahifadhiwa." : "Showcase image could not be saved.", tone: "error" });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mt-4 rounded-lg border border-slate-200 p-3 dark:border-slate-800">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0 flex-1">
          <MediaPicker canManage={canManage} label={sw ? "Picha ya kuonyesha bidhaa" : "Product showcase image"} media={media} onUpload={onUpload} selectedIds={mediaId ? [mediaId] : []} setSelectedIds={(ids) => setMediaId(ids[0] ?? "")} single sw={sw} />
          <p className="mt-2 text-[11px] text-slate-400">{sw ? "Picha hii hutumika kwenye kadi za bidhaa, makundi na sehemu za bidhaa zilizoangaziwa." : "This image represents the product on product cards, categories, and featured surfaces."}</p>
        </div>
        {canManage ? (
          <div className="shrink-0">
            {dirty ? <p className="mb-1 text-[11px] font-medium text-amber-600">{sw ? "Mabadiliko hayajahifadhiwa" : "Unsaved changes"}</p> : null}
            <Button disabled={!dirty || saving} onClick={() => void save()} size="small">
              {saving ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
              {saving ? (sw ? "Inahifadhi..." : "Saving...") : (sw ? "Hifadhi mabadiliko" : "Save changes")}
            </Button>
          </div>
        ) : null}
      </div>
    </div>
  );
}

function VariantEditor({ businessId, canManage, listingId, media, onChanged, onUpload, siteId, sw, variant }: {
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

  useEffect(() => {
    setPrice(variant.website_price ?? "");
    setAvailability(variant.website_availability);
    setGalleryMediaIds(variant.gallery_media_ids);
    setPublished(variant.is_published);
  }, [variant.gallery_media_ids, variant.is_published, variant.website_availability, variant.website_price]);

  const commerceOrigin = Boolean(variant.commerce_product_id);
  const commerceConnected = !commerceOrigin || variant.commerce_connected;
  const canPublish = canManage && commerceConnected;
  const dirty =
    price !== (variant.website_price ?? "") ||
    availability !== variant.website_availability ||
    published !== variant.is_published ||
    galleryMediaIds.join("|") !== variant.gallery_media_ids.join("|");

  async function save() {
    if (!canManage || !dirty) return;
    setSaving(true);
    try {
      await request((token) => updateWebsiteVariant(businessId, siteId, listingId, variant.id, {
        gallery_media_ids: galleryMediaIds,
        is_published: commerceConnected ? published : false,
        website_availability: availability,
        website_price: price.trim() || null,
      }, token));
      notify({ message: sw ? "Mabadiliko ya SKU yamehifadhiwa." : "SKU changes saved.", tone: "success" });
      await onChanged();
    } catch (error) {
      notify({ message: error instanceof Error ? error.message : sw ? "Imeshindikana kuhifadhi SKU." : "SKU could not be saved.", tone: "error" });
    } finally {
      setSaving(false);
    }
  }

  async function remove() {
    if (!canManage || commerceOrigin || !window.confirm(sw ? "Futa SKU hii ya Website?" : "Delete this Website SKU?")) return;
    try {
      await request((token) => deleteWebsiteVariant(businessId, siteId, listingId, variant.id, token));
      notify({ message: sw ? "SKU imefutwa." : "Website SKU deleted.", tone: "success" });
      await onChanged();
    } catch (error) {
      notify({ message: error instanceof Error ? error.message : sw ? "Imeshindikana kufuta SKU." : "Website SKU could not be deleted.", tone: "error" });
    }
  }

  return (
    <div className="grid gap-3 rounded-lg border border-slate-200 p-3 dark:border-slate-800 md:grid-cols-6">
      <div className="md:col-span-2">
        <p className="text-sm font-semibold">{variant.sku}</p>
        <p className="mt-1 text-xs text-slate-500">{Object.entries(variant.options).map(([key, value]) => `${key}: ${value}`).join(" · ") || (sw ? "Hakuna chaguo" : "No options")}</p>
        <p className="mt-1 text-[11px] text-slate-400">{commerceOrigin ? (commerceConnected ? (sw ? "Imeunganishwa na Commerce" : "Commerce linked") : (sw ? "Imeondolewa kwenye Website" : "Removed from Website")) : (sw ? "SKU ya Website" : "Website SKU")}</p>
      </div>

      <input aria-label={sw ? "Bei ya Website" : "Website price"} className={fieldClassName} disabled={!canManage} inputMode="decimal" onChange={(event) => setPrice(event.target.value)} placeholder={sw ? "Bei TZS" : "Price TZS"} value={price} />

      {commerceOrigin ? (
        <div className="flex h-10 items-center rounded-lg border border-slate-200 px-3 text-xs text-slate-500 dark:border-slate-800">{commerceConnected ? (sw ? "Upatikanaji kutoka Commerce" : "Availability from Commerce") : (sw ? "Haijaunganishwa" : "Not connected")}</div>
      ) : (
        <select aria-label={sw ? "Upatikanaji" : "Availability"} className={fieldClassName} disabled={!canManage} onChange={(event) => setAvailability(event.target.value as WebsiteVariantAvailability)} value={availability}>
          <option value="in_stock">{sw ? "Ipo" : "In stock"}</option>
          <option value="low_stock">{sw ? "Imebaki chache" : "Low stock"}</option>
          <option value="out_of_stock">{sw ? "Imeisha" : "Out of stock"}</option>
        </select>
      )}

      <div className="flex items-center gap-2 md:col-span-2 md:justify-end">
        <label className="flex items-center gap-2 text-xs">
          <input checked={commerceConnected && published} disabled={!canPublish} onChange={(event) => setPublished(event.target.checked)} type="checkbox" />
          {sw ? "Imechapishwa" : "Published"}
        </label>
        {!commerceOrigin && canManage ? (
          <button aria-label={sw ? "Futa SKU" : "Delete Website SKU"} className="inline-flex size-8 items-center justify-center rounded-md text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30" onClick={() => void remove()} type="button"><Trash2 className="size-4" /></button>
        ) : null}
      </div>

      <div className="md:col-span-6">
        <MediaPicker canManage={canManage} label={sw ? "Picha za SKU" : "SKU images"} media={media} onUpload={onUpload} selectedIds={galleryMediaIds} setSelectedIds={setGalleryMediaIds} sw={sw} />
      </div>

      {canManage ? (
        <div className="flex flex-wrap items-center justify-between gap-2 md:col-span-6">
          <p className={`text-[11px] font-medium ${dirty ? "text-amber-600" : "text-emerald-600"}`}>{dirty ? (sw ? "Mabadiliko hayajahifadhiwa" : "Unsaved changes") : (sw ? "Imehifadhiwa" : "Saved")}</p>
          <Button disabled={!dirty || saving} onClick={() => void save()} size="small">
            {saving ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
            {saving ? (sw ? "Inahifadhi..." : "Saving...") : (sw ? "Hifadhi mabadiliko" : "Save changes")}
          </Button>
        </div>
      ) : null}
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
  const [creationKind, setCreationKind] = useState<CreationKind | null>(null);
  const [titleEn, setTitleEn] = useState("");
  const [titleSw, setTitleSw] = useState("");
  const [brand, setBrand] = useState("");
  const [primaryMediaId, setPrimaryMediaId] = useState("");
  const [creationSkus, setCreationSkus] = useState<VariantDraft[]>([emptyVariantDraft()]);
  const [creating, setCreating] = useState(false);
  const [variantDrafts, setVariantDrafts] = useState<Record<string, VariantDraft>>({});
  const [openWebsiteSkuForms, setOpenWebsiteSkuForms] = useState<Record<string, boolean>>({});

  const copy = useMemo(() => ({
    title: sw ? "Bidhaa za tovuti" : "Website products",
    subtitle: sw ? "Simamia picha ya kuonyesha bidhaa, uchapishaji, bei na picha za SKU." : "Manage the product showcase image, publishing, prices, and SKU galleries.",
  }), [sw]);

  const load = useCallback(async (signal?: AbortSignal) => {
    if (workspaceStatus !== "ready") return;
    setLoading(true);
    setError(null);
    try {
      const sitesResponse = await request((token) => getWebsiteSites(businessId, token, signal));
      const activeSite = sitesResponse.data?.sites[0] ?? null;
      setSite(activeSite);
      if (!activeSite) { setListings([]); setMedia([]); return; }
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
  }, [businessId, request, sw, workspaceStatus]);

  useEffect(() => {
    const controller = new AbortController();
    const initialLoad = window.setTimeout(() => void load(controller.signal), 0);
    return () => { window.clearTimeout(initialLoad); controller.abort(); };
  }, [load]);

  async function uploadMedia(file: File): Promise<string | null> {
    if (!site || !canManage) return null;
    try {
      const response = await request((token) => uploadWebsiteMedia(businessId, site.id, file, { en: file.name, sw: file.name }, token));
      const uploaded = response.data ?? null;
      if (!uploaded) return null;
      setMedia((current) => [...current.filter((item) => item.id !== uploaded.id), uploaded]);
      notify({ message: sw ? "Picha imepakiwa kwenye galari. Hifadhi mabadiliko ili kuitumia." : "Image uploaded to the gallery. Save changes to use it here.", tone: "success" });
      return uploaded.id;
    } catch (uploadError) {
      notify({ message: uploadError instanceof Error ? uploadError.message : sw ? "Picha haijapakiwa." : "Image could not be uploaded.", tone: "error" });
      return null;
    }
  }

  function resetCreation() {
    setCreationKind(null);
    setTitleEn("");
    setTitleSw("");
    setBrand("");
    setPrimaryMediaId("");
    setCreationSkus([emptyVariantDraft()]);
  }

  async function createProduct() {
    if (!site || !canManage || !creationKind || !titleEn.trim()) return;
    const familyMode = creationKind === "family";
    const resolvedSkus: { draft: VariantDraft; options: Record<string, string> }[] = [];

    for (const draft of creationSkus) {
      const result = optionsFromRows(draft.optionRows, familyMode, sw);
      if (result.error || !result.options) {
        notify({ message: result.error ?? (sw ? "Kagua chaguo za SKU." : "Check the SKU options."), tone: "error" });
        return;
      }
      resolvedSkus.push({ draft, options: result.options });
    }

    setCreating(true);
    let createdListingId: string | null = null;
    try {
      const listingResponse = await request((token) => createWebsiteListing(businessId, site.id, {
        brand: brand.trim(),
        is_published: false,
        primary_media_id: primaryMediaId || null,
        slug: automaticSlug(titleEn, listings),
        title: { en: titleEn.trim(), sw: titleSw.trim() },
      }, token));
      const createdListing = listingResponse.data;
      if (!createdListing) throw new Error(sw ? "Bidhaa haikuundwa." : "The product was not created.");
      createdListingId = createdListing.id;

      for (const { draft, options } of resolvedSkus) {
        await request((token) => createWebsiteVariant(businessId, site.id, createdListing.id, {
          currency: "TZS",
          gallery_media_ids: draft.galleryMediaIds,
          is_published: false,
          options,
          website_availability: draft.availability,
          website_price: draft.price.trim() || null,
        }, token));
      }

      notify({
        message: familyMode
          ? (sw ? "Familia ya bidhaa imeundwa kama rasimu." : "Product family created as a draft.")
          : (sw ? "Bidhaa binafsi imeundwa kama rasimu." : "Standalone product created as a draft."),
        tone: "success",
      });
      resetCreation();
      await load();
    } catch (createError) {
      if (createdListingId) {
        try {
          await request((token) => deleteWebsiteListing(businessId, site.id, createdListingId!, token));
        } catch {
          // Keep the original creation error as the user-facing failure.
        }
      }
      notify({
        message: createError instanceof Error
          ? createError.message
          : sw
            ? "Bidhaa haikuundwa. Kagua taarifa na ujaribu tena."
            : "The product could not be created. Check the details and try again.",
        tone: "error",
      });
    } finally {
      setCreating(false);
    }
  }

  async function toggleListing(listing: WebsiteListing) {
    if (!site || !canManage) return;
    const publishable = listing.variants.some((variant) => !variant.commerce_product_id || variant.commerce_connected);
    if (!listing.is_published && !publishable) {
      notify({ message: sw ? "Unganisha angalau SKU moja kabla ya kuchapisha bidhaa hii." : "Connect at least one SKU before publishing this product.", tone: "error" });
      return;
    }
    await request((token) => updateWebsiteListing(businessId, site.id, listing.id, { is_published: !listing.is_published }, token));
    await load();
  }

  async function removeListing(listing: WebsiteListing) {
    if (!site || !canManage || !window.confirm(sw ? "Futa bidhaa hii?" : "Delete this product?")) return;
    await request((token) => deleteWebsiteListing(businessId, site.id, listing.id, token));
    await load();
  }

  function draftFor(listingId: string): VariantDraft {
    return variantDrafts[listingId] ?? emptyVariantDraft(true);
  }

  function updateDraft(listingId: string, changes: Partial<VariantDraft>) {
    setVariantDrafts((current) => ({ ...current, [listingId]: { ...draftFor(listingId), ...changes } }));
  }

  async function addWebsiteSku(listing: WebsiteListing) {
    if (!site || !canManage) return;
    const draft = draftFor(listing.id);
    const result = optionsFromRows(draft.optionRows, true, sw);
    if (result.error || !result.options) {
      notify({ message: result.error ?? (sw ? "Kagua chaguo za SKU." : "Check the SKU options."), tone: "error" });
      return;
    }
    try {
      await request((token) => createWebsiteVariant(businessId, site.id, listing.id, {
        currency: "TZS",
        gallery_media_ids: draft.galleryMediaIds,
        is_published: false,
        options: result.options,
        website_availability: draft.availability,
        website_price: draft.price.trim() || null,
      }, token));
      setVariantDrafts((current) => { const next = { ...current }; delete next[listing.id]; return next; });
      setOpenWebsiteSkuForms((current) => ({ ...current, [listing.id]: false }));
      notify({ message: sw ? "SKU ya Website imeundwa kama rasimu." : "Website SKU created as a draft.", tone: "success" });
      await load();
    } catch (createError) {
      notify({
        message: createError instanceof Error
          ? createError.message
          : sw
            ? "SKU haikuundwa. Kagua taarifa na ujaribu tena."
            : "The SKU could not be created. Check the details and try again.",
        tone: "error",
      });
    }
  }

  if (workspaceStatus !== "ready" || loading) return <div className="flex min-h-64 items-center justify-center gap-2 text-sm text-slate-500"><Loader2 className="size-4 animate-spin" />{sw ? "Inapakia bidhaa..." : "Loading products..."}</div>;
  if (error) return <section className="rounded-lg border border-red-200 bg-red-50 p-5 dark:border-red-900 dark:bg-red-950/30"><p className="text-sm text-red-800 dark:text-red-200">{error}</p><Button className="mt-3" onClick={() => void load()} size="small" variant="outline"><RefreshCw className="size-4" />{sw ? "Jaribu tena" : "Try again"}</Button></section>;
  if (!site) return <section className="rounded-lg border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-950"><h1 className="text-lg font-semibold">{copy.title}</h1><p className="mt-2 text-sm text-slate-500">{sw ? "Tovuti haijaundwa bado. Fungua Media kwanza ili kuanzisha tovuti." : "No website exists yet. Open Media first to bootstrap the website."}</p></section>;

  return (
    <div className="space-y-5">
      <header>
        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">Website</p>
        <h1 className="mt-1 text-2xl font-semibold text-slate-950 dark:text-white">{copy.title}</h1>
        <p className="mt-1 text-sm text-slate-500">{copy.subtitle}</p>
      </header>

      {canManage ? (
        <section className="rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-950 sm:p-5">
          <h2 className="text-sm font-semibold">{sw ? "Ongeza bidhaa ya Website" : "Add Website product"}</h2>
          <p className="mt-1 text-xs text-slate-500">{sw ? "Chagua kwanza kama ni bidhaa binafsi au familia yenye SKU kadhaa." : "First choose whether this is one standalone product or a family with multiple SKUs."}</p>

          {!creationKind ? (
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              <button
                className="rounded-lg border border-slate-200 p-4 text-left hover:border-slate-400 dark:border-slate-800"
                onClick={() => {
                  setCreationKind("standalone");
                  setCreationSkus([emptyVariantDraft()]);
                }}
                type="button"
              >
                <p className="font-semibold">{sw ? "Bidhaa binafsi" : "Standalone product"}</p>
                <p className="mt-1 text-xs text-slate-500">{sw ? "Bidhaa moja inayouzwa kama SKU moja." : "One sellable product with one Website SKU."}</p>
              </button>
              <button
                className="rounded-lg border border-slate-200 p-4 text-left hover:border-slate-400 dark:border-slate-800"
                onClick={() => {
                  setCreationKind("family");
                  setCreationSkus([emptyVariantDraft(true)]);
                }}
                type="button"
              >
                <p className="font-semibold">{sw ? "Familia ya bidhaa" : "Product family"}</p>
                <p className="mt-1 text-xs text-slate-500">{sw ? "Kundi la SKU zinazotofautiana kwa rangi, ukubwa, hifadhi au chaguo nyingine." : "A group of SKUs that differ by color, size, storage, or other options."}</p>
              </button>
            </div>
          ) : (
            <div className="mt-4 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    {creationKind === "family" ? (sw ? "Familia ya bidhaa" : "Product family") : (sw ? "Bidhaa binafsi" : "Standalone product")}
                  </p>
                  <p className="mt-1 text-[11px] text-slate-400">{sw ? "Anwani ya bidhaa itatengenezwa kiotomatiki kutoka kwenye jina." : "The product URL will be generated automatically from the product name."}</p>
                </div>
                <Button onClick={resetCreation} size="small" type="button" variant="ghost">{sw ? "Badilisha aina" : "Change type"}</Button>
              </div>

              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                <input className={fieldClassName} onChange={(event) => setTitleEn(event.target.value)} placeholder="English title" value={titleEn} />
                <input className={fieldClassName} onChange={(event) => setTitleSw(event.target.value)} placeholder="Jina la Kiswahili" value={titleSw} />
                <input className={fieldClassName} onChange={(event) => setBrand(event.target.value)} placeholder={sw ? "Chapa (si lazima)" : "Brand (optional)"} value={brand} />
              </div>

              <div className="max-w-xl">
                <MediaPicker canManage label={sw ? "Picha ya kuonyesha bidhaa" : "Product showcase image"} media={media} onUpload={uploadMedia} selectedIds={primaryMediaId ? [primaryMediaId] : []} setSelectedIds={(ids) => setPrimaryMediaId(ids[0] ?? "")} single sw={sw} />
              </div>

              <div className="space-y-3">
                {creationSkus.map((draft, index) => (
                  <DraftSkuEditor
                    draft={draft}
                    familyMode={creationKind === "family"}
                    key={index}
                    media={media}
                    onChange={(nextDraft) => setCreationSkus((current) => current.map((item, itemIndex) => itemIndex === index ? nextDraft : item))}
                    onRemove={creationKind === "family" && creationSkus.length > 1 ? () => setCreationSkus((current) => current.filter((_, itemIndex) => itemIndex !== index)) : undefined}
                    onUpload={uploadMedia}
                    sw={sw}
                    title={creationKind === "family" ? `${sw ? "SKU" : "SKU"} ${index + 1}` : (sw ? "Bidhaa" : "Product details")}
                  />
                ))}
              </div>

              {creationKind === "family" ? (
                <Button onClick={() => setCreationSkus((current) => [...current, emptyVariantDraft(true)])} size="small" type="button" variant="outline">
                  <Plus className="size-4" />
                  {sw ? "Ongeza SKU nyingine" : "Add another SKU"}
                </Button>
              ) : null}

              <div>
                <Button disabled={creating || !titleEn.trim()} onClick={() => void createProduct()} size="small">
                  {creating ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />}
                  {creating
                    ? (sw ? "Inaunda..." : "Creating...")
                    : creationKind === "family"
                      ? (sw ? "Unda familia" : "Create family")
                      : (sw ? "Unda bidhaa binafsi" : "Create standalone product")}
                </Button>
              </div>
            </div>
          )}
        </section>
      ) : null}

      <section className="space-y-4">
        {listings.length === 0 ? <div className="rounded-lg border border-dashed border-slate-300 bg-white p-10 text-center text-sm text-slate-500 dark:border-slate-700 dark:bg-slate-950">{sw ? "Hakuna bidhaa za tovuti bado." : "No Website products yet."}</div> : listings.map((listing) => {
          const draft = draftFor(listing.id);
          const skuFormOpen = Boolean(openWebsiteSkuForms[listing.id]);
          const commerceOrigin = listing.variants.some((variant) => Boolean(variant.commerce_product_id));
          const websiteStandalone =
            !commerceOrigin &&
            listing.variants.length === 1 &&
            Object.keys(listing.variants[0]?.options ?? {}).length === 0;
          return (
            <article className="rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-950 sm:p-5" key={listing.id}>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="font-semibold">{listing.title[locale] || listing.title.en || listing.slug}</h2>
                    {!commerceOrigin ? (
                      <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold uppercase text-slate-600 dark:bg-slate-900 dark:text-slate-300">
                        {websiteStandalone ? (sw ? "Binafsi" : "Standalone") : (sw ? "Familia" : "Family")}
                      </span>
                    ) : null}
                  </div>
                  <p className="mt-1 text-xs text-slate-500">{listing.brand ? `${listing.brand} · ` : ""}{listing.variants.length} SKU</p>
                </div>
                {canManage ? <div className="flex gap-2"><Button onClick={() => void toggleListing(listing)} size="small" variant="outline">{listing.is_published ? (sw ? "Rudisha rasimu" : "Unpublish") : (sw ? "Chapisha" : "Publish")}</Button><button aria-label={sw ? "Futa bidhaa" : "Delete product"} className="inline-flex size-9 items-center justify-center rounded-lg text-red-500 hover:bg-red-50" onClick={() => void removeListing(listing)} type="button"><Trash2 className="size-4" /></button></div> : null}
              </div>

              <ShowcaseEditor businessId={businessId} canManage={canManage} listing={listing} media={media} onChanged={load} onUpload={uploadMedia} siteId={site.id} sw={sw} />

              <div className="mt-4 space-y-2">{listing.variants.map((variant) => <VariantEditor businessId={businessId} canManage={canManage} key={variant.id} listingId={listing.id} media={media} onChanged={load} onUpload={uploadMedia} siteId={site.id} sw={sw} variant={variant} />)}</div>

              {canManage && !websiteStandalone ? (
                <div className="mt-4">
                  <Button onClick={() => setOpenWebsiteSkuForms((current) => ({ ...current, [listing.id]: !skuFormOpen }))} size="small" variant="outline"><Plus className="size-4" />{sw ? "Ongeza SKU ya Website" : "Add Website SKU"}</Button>
                  {skuFormOpen ? (
                    <div className="mt-3 rounded-lg bg-slate-50 p-3 dark:bg-slate-900/50">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div><p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{sw ? "SKU mpya ya Website" : "New Website SKU"}</p><p className="mt-1 text-[11px] text-slate-400">{sw ? "Website itatengeneza nambari ya SKU kiotomatiki. Tumia chaguo kueleza tofauti kama rangi au ukubwa." : "The Website generates the SKU number automatically. Use options to describe differences such as color or size."}</p></div>
                        <button aria-label={sw ? "Funga" : "Close"} className="inline-flex size-8 items-center justify-center rounded-md text-slate-500 hover:bg-slate-200/60 dark:hover:bg-slate-800" onClick={() => setOpenWebsiteSkuForms((current) => ({ ...current, [listing.id]: false }))} type="button"><X className="size-4" /></button>
                      </div>
                      <div className="mt-3 grid gap-2 md:grid-cols-2">
                        <input className={fieldClassName} inputMode="decimal" onChange={(event) => updateDraft(listing.id, { price: event.target.value })} placeholder={sw ? "Bei TZS" : "Price TZS"} value={draft.price} />
                        <select className={fieldClassName} onChange={(event) => updateDraft(listing.id, { availability: event.target.value as WebsiteVariantAvailability })} value={draft.availability}><option value="in_stock">{sw ? "Ipo" : "In stock"}</option><option value="low_stock">{sw ? "Imebaki chache" : "Low stock"}</option><option value="out_of_stock">{sw ? "Imeisha" : "Out of stock"}</option></select>
                      </div>
                      <div className="mt-3"><OptionRows rows={draft.optionRows} onChange={(optionRows) => updateDraft(listing.id, { optionRows })} sw={sw} /></div>
                      <div className="mt-3"><MediaPicker canManage label={sw ? "Picha za SKU" : "SKU images"} media={media} onUpload={uploadMedia} selectedIds={draft.galleryMediaIds} setSelectedIds={(galleryMediaIds) => updateDraft(listing.id, { galleryMediaIds })} sw={sw} /></div>
                      <Button className="mt-3" onClick={() => void addWebsiteSku(listing)} size="small"><Plus className="size-4" />{sw ? "Unda SKU ya Website" : "Create Website SKU"}</Button>
                    </div>
                  ) : null}
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
