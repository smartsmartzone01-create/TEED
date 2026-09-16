"use client";

import { ArrowDown, ArrowUp, Loader2, Plus, Save, Trash2, Upload } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { Button } from "@/components/global/primitives/button";
import { useWebsiteRequest } from "@/hooks/website/use-website-request";
import { useNotification } from "@/providers/global/notification-provider";
import { updateWebsiteListing } from "@/services/website/website";
import type {
  WebsiteListing,
  WebsiteListingStoryBlockInput,
  WebsiteMedia,
} from "@/types/website/website";

const fieldClassName =
  "h-10 w-full rounded-lg border border-slate-300 bg-transparent px-3 text-sm outline-none focus:border-slate-500 dark:border-slate-700";
const textareaClassName =
  "min-h-28 w-full rounded-lg border border-slate-300 bg-transparent px-3 py-2 text-sm outline-none focus:border-slate-500 dark:border-slate-700";
const MAX_STORY_BLOCKS = 5;

type StoryDraft = WebsiteListingStoryBlockInput & { key: string };

function draftKey() {
  return Math.random().toString(36).slice(2, 10);
}

function storyDrafts(listing: WebsiteListing): StoryDraft[] {
  return listing.story_blocks.map((block) => ({
    key: block.id || draftKey(),
    heading: { en: block.heading.en ?? "", sw: block.heading.sw ?? "" },
    body: { en: block.body.en ?? "", sw: block.body.sw ?? "" },
    media_id: block.media_id,
  }));
}

function MediaField({ canManage, label, media, mediaId, onChange, onUpload, sw }: {
  canManage: boolean;
  label: string;
  media: WebsiteMedia[];
  mediaId: string | null | undefined;
  onChange: (mediaId: string | null) => void;
  onUpload: (file: File) => Promise<string | null>;
  sw: boolean;
}) {
  const [uploading, setUploading] = useState(false);
  const selected = media.find((item) => item.id === mediaId);

  async function upload(file: File) {
    if (!canManage) return;
    setUploading(true);
    try {
      const id = await onUpload(file);
      if (id) onChange(id);
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="space-y-2">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p>
      {selected ? (
        <div className="flex items-center gap-3">
          <span
            aria-label={selected.original_name || label}
            className="block size-16 shrink-0 rounded-lg border border-slate-200 bg-cover bg-center dark:border-slate-800"
            role="img"
            style={{ backgroundImage: `url("${selected.public_url}")` }}
          />
          <p className="min-w-0 truncate text-xs text-slate-500">{selected.original_name || selected.id}</p>
        </div>
      ) : null}
      <div className="flex flex-col gap-2 sm:flex-row">
        <select
          className={fieldClassName}
          disabled={!canManage}
          onChange={(event) => onChange(event.target.value || null)}
          value={mediaId ?? ""}
        >
          <option value="">{sw ? "Hakuna picha" : "No image"}</option>
          {media.map((item) => (
            <option key={item.id} value={item.id}>{item.original_name || item.id}</option>
          ))}
        </select>
        {canManage ? (
          <label className={`inline-flex h-10 shrink-0 cursor-pointer items-center justify-center gap-2 rounded-lg border border-slate-200 px-3 text-xs font-medium dark:border-slate-800 ${uploading ? "pointer-events-none opacity-60" : ""}`}>
            {uploading ? <Loader2 className="size-4 animate-spin" /> : <Upload className="size-4" />}
            {sw ? "Pakia" : "Upload"}
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
        ) : null}
      </div>
    </div>
  );
}

function ProductPageContentEditor({ businessId, canManage, listing, media, onChanged, onUpload, siteId, sw }: {
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
  const initialStories = useMemo(() => storyDrafts(listing), [listing]);
  const [descriptionEn, setDescriptionEn] = useState(listing.description.en ?? "");
  const [descriptionSw, setDescriptionSw] = useState(listing.description.sw ?? "");
  const [discoverMediaId, setDiscoverMediaId] = useState<string | null>(listing.discover_media_id);
  const [stories, setStories] = useState<StoryDraft[]>(initialStories);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setDescriptionEn(listing.description.en ?? "");
    setDescriptionSw(listing.description.sw ?? "");
    setDiscoverMediaId(listing.discover_media_id);
    setStories(storyDrafts(listing));
  }, [listing]);

  const payloadStories = stories.map((story) => ({
    heading: {
      en: story.heading?.en?.trim() ?? "",
      sw: story.heading?.sw?.trim() ?? "",
    },
    body: {
      en: story.body?.en?.trim() ?? "",
      sw: story.body?.sw?.trim() ?? "",
    },
    media_id: story.media_id || null,
  }));

  const currentPayload = JSON.stringify({
    description: {
      en: listing.description.en ?? "",
      sw: listing.description.sw ?? "",
    },
    discover_media_id: listing.discover_media_id,
    story_blocks: storyDrafts(listing).map(({ key: _key, ...story }) => ({
      heading: { en: story.heading?.en ?? "", sw: story.heading?.sw ?? "" },
      body: { en: story.body?.en ?? "", sw: story.body?.sw ?? "" },
      media_id: story.media_id || null,
    })),
  });
  const nextPayload = JSON.stringify({
    description: { en: descriptionEn.trim(), sw: descriptionSw.trim() },
    discover_media_id: discoverMediaId,
    story_blocks: payloadStories,
  });
  const dirty = currentPayload !== nextPayload;

  function updateStory(key: string, changes: Partial<StoryDraft>) {
    setStories((current) => current.map((story) => story.key === key ? { ...story, ...changes } : story));
  }

  function moveStory(index: number, offset: number) {
    setStories((current) => {
      const nextIndex = index + offset;
      if (nextIndex < 0 || nextIndex >= current.length) return current;
      const next = [...current];
      [next[index], next[nextIndex]] = [next[nextIndex], next[index]];
      return next;
    });
  }

  async function save() {
    if (!canManage || !dirty) return;
    const invalid = payloadStories.some((story) =>
      !story.heading.en && !story.heading.sw && !story.body.en && !story.body.sw && !story.media_id,
    );
    if (invalid) {
      notify({ message: sw ? "Kila sehemu ya maelezo inahitaji kichwa, maelezo au picha." : "Each story block needs a heading, description, or image.", tone: "error" });
      return;
    }

    setSaving(true);
    try {
      await request((token) => updateWebsiteListing(businessId, siteId, listing.id, {
        description: { en: descriptionEn.trim(), sw: descriptionSw.trim() },
        discover_media_id: discoverMediaId,
        story_blocks: payloadStories,
      }, token));
      notify({ message: sw ? "Maudhui ya ukurasa wa bidhaa yamehifadhiwa." : "Product page content saved.", tone: "success" });
      await onChanged();
    } catch (error) {
      notify({ message: error instanceof Error ? error.message : sw ? "Maudhui hayajahifadhiwa." : "Product page content could not be saved.", tone: "error" });
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="mt-4 rounded-lg border border-slate-200 p-3 dark:border-slate-800">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold">{sw ? "Maudhui ya ukurasa wa bidhaa" : "Product page content"}</p>
          <p className="mt-1 text-xs text-slate-500">
            {sw
              ? "Dhibiti sehemu ya Gundua na hadi sehemu tano za maelezo ya bidhaa."
              : "Manage the Discover section and up to five ordered product-story blocks."}
          </p>
        </div>
        {canManage ? (
          <Button disabled={!dirty || saving} onClick={() => void save()} size="small">
            {saving ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
            {saving ? (sw ? "Inahifadhi..." : "Saving...") : (sw ? "Hifadhi" : "Save")}
          </Button>
        ) : null}
      </div>

      <div className="mt-4 space-y-4">
        <div className="rounded-lg bg-slate-50 p-3 dark:bg-slate-900/50">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{sw ? "Gundua" : "Discover"}</p>
          <p className="mt-1 text-[11px] text-slate-400">
            {sw
              ? "Picha isipochaguliwa, Website itatumia picha ya kuonyesha bidhaa."
              : "If no Discover image is selected, the storefront falls back to the product showcase image."}
          </p>
          <div className="mt-3 grid gap-3 lg:grid-cols-2">
            <textarea
              className={textareaClassName}
              disabled={!canManage}
              onChange={(event) => setDescriptionEn(event.target.value)}
              placeholder="Discover introduction (English)"
              value={descriptionEn}
            />
            <textarea
              className={textareaClassName}
              disabled={!canManage}
              onChange={(event) => setDescriptionSw(event.target.value)}
              placeholder="Utangulizi wa Gundua (Kiswahili)"
              value={descriptionSw}
            />
          </div>
          <div className="mt-3">
            <MediaField
              canManage={canManage}
              label={sw ? "Picha ya Gundua" : "Discover image"}
              media={media}
              mediaId={discoverMediaId}
              onChange={setDiscoverMediaId}
              onUpload={onUpload}
              sw={sw}
            />
          </div>
        </div>

        <div className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{sw ? "Maelezo ya bidhaa" : "Product story"}</p>
              <p className="mt-1 text-[11px] text-slate-400">
                {sw
                  ? "Picha ni ya hiari. Sehemu isiyo na picha itaonyesha maandishi pekee."
                  : "Images are optional. A block without an image renders as text only."}
              </p>
            </div>
            {canManage && stories.length < MAX_STORY_BLOCKS ? (
              <Button
                onClick={() => setStories((current) => [...current, { key: draftKey(), heading: { en: "", sw: "" }, body: { en: "", sw: "" }, media_id: null }])}
                size="small"
                type="button"
                variant="outline"
              >
                <Plus className="size-4" />
                {sw ? "Ongeza sehemu" : "Add block"}
              </Button>
            ) : null}
          </div>

          {stories.length === 0 ? (
            <p className="rounded-lg border border-dashed border-slate-300 p-4 text-xs text-slate-500 dark:border-slate-700">
              {sw ? "Hakuna sehemu za maelezo bado." : "No product-story blocks yet."}
            </p>
          ) : stories.map((story, index) => (
            <div className="rounded-lg border border-slate-200 p-3 dark:border-slate-800" key={story.key}>
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-semibold">{sw ? `Sehemu ${index + 1}` : `Block ${index + 1}`}</p>
                {canManage ? (
                  <div className="flex items-center gap-1">
                    <button aria-label={sw ? "Hamisha juu" : "Move up"} className="inline-flex size-8 items-center justify-center rounded-md hover:bg-slate-100 disabled:opacity-30 dark:hover:bg-slate-900" disabled={index === 0} onClick={() => moveStory(index, -1)} type="button"><ArrowUp className="size-4" /></button>
                    <button aria-label={sw ? "Hamisha chini" : "Move down"} className="inline-flex size-8 items-center justify-center rounded-md hover:bg-slate-100 disabled:opacity-30 dark:hover:bg-slate-900" disabled={index === stories.length - 1} onClick={() => moveStory(index, 1)} type="button"><ArrowDown className="size-4" /></button>
                    <button aria-label={sw ? "Futa sehemu" : "Delete block"} className="inline-flex size-8 items-center justify-center rounded-md text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30" onClick={() => setStories((current) => current.filter((item) => item.key !== story.key))} type="button"><Trash2 className="size-4" /></button>
                  </div>
                ) : null}
              </div>

              <div className="mt-3 grid gap-2 lg:grid-cols-2">
                <input
                  className={fieldClassName}
                  disabled={!canManage}
                  onChange={(event) => updateStory(story.key, { heading: { ...story.heading, en: event.target.value } })}
                  placeholder="Heading (English)"
                  value={story.heading?.en ?? ""}
                />
                <input
                  className={fieldClassName}
                  disabled={!canManage}
                  onChange={(event) => updateStory(story.key, { heading: { ...story.heading, sw: event.target.value } })}
                  placeholder="Kichwa (Kiswahili)"
                  value={story.heading?.sw ?? ""}
                />
                <textarea
                  className={textareaClassName}
                  disabled={!canManage}
                  onChange={(event) => updateStory(story.key, { body: { ...story.body, en: event.target.value } })}
                  placeholder="Description (English)"
                  value={story.body?.en ?? ""}
                />
                <textarea
                  className={textareaClassName}
                  disabled={!canManage}
                  onChange={(event) => updateStory(story.key, { body: { ...story.body, sw: event.target.value } })}
                  placeholder="Maelezo (Kiswahili)"
                  value={story.body?.sw ?? ""}
                />
              </div>
              <div className="mt-3">
                <MediaField
                  canManage={canManage}
                  label={sw ? "Picha ya sehemu (si lazima)" : "Block image (optional)"}
                  media={media}
                  mediaId={story.media_id}
                  onChange={(mediaId) => updateStory(story.key, { media_id: mediaId })}
                  onUpload={onUpload}
                  sw={sw}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export { ProductPageContentEditor };
