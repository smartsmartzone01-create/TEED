"use client";

import { ImagePlus, Loader2, RefreshCw, Trash2 } from "lucide-react";
import { useLocale } from "next-intl";
import { useCallback, useEffect, useMemo, useState } from "react";

import { Button } from "@/components/global/primitives/button";
import { useWebsiteRequest } from "@/hooks/website/use-website-request";
import { useNotification } from "@/providers/global/notification-provider";
import { useWorkspace } from "@/providers/workspace/workspace-provider";
import {
  createWebsiteSite,
  deleteWebsiteMedia,
  getWebsiteMedia,
  getWebsiteSites,
  uploadWebsiteMedia,
} from "@/services/website/website";
import type { WebsiteMedia, WebsiteSite } from "@/types/website/website";

function WebsiteMediaManager({ businessId }: { businessId: string }) {
  const locale = useLocale();
  const sw = locale === "sw";
  const request = useWebsiteRequest();
  const { notify } = useNotification();
  const { businesses, status: workspaceStatus } = useWorkspace();
  const business = businesses.find((item) => item.id === businessId);
  const canManage = Boolean(business?.membership.permissions.includes("website.manage"));
  const [site, setSite] = useState<WebsiteSite | null>(null);
  const [media, setMedia] = useState<WebsiteMedia[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [altEn, setAltEn] = useState("");
  const [altSw, setAltSw] = useState("");
  const [uploading, setUploading] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const labels = useMemo(
    () => ({
      title: sw ? "Maktaba ya picha za tovuti" : "Website media library",
      subtitle: sw
        ? "Pakia na simamia picha zinazotumiwa na tovuti yako."
        : "Upload and manage images used by your website.",
    }),
    [sw],
  );

  const load = useCallback(
    async (signal?: AbortSignal) => {
      if (workspaceStatus !== "ready") return;
      setLoading(true);
      setError(null);
      try {
        const siteResponse = await request((token) =>
          getWebsiteSites(businessId, token, signal),
        );
        let activeSite = siteResponse.data?.sites[0] ?? null;
        if (!activeSite && canManage) {
          const created = await request((token) => createWebsiteSite(businessId, token));
          activeSite = created.data ?? null;
        }
        setSite(activeSite);
        if (!activeSite) {
          setMedia([]);
          return;
        }
        const mediaResponse = await request((token) =>
          getWebsiteMedia(businessId, activeSite.id, token, signal),
        );
        setMedia(mediaResponse.data?.media ?? []);
      } catch (loadError) {
        if (signal?.aborted) return;
        setError(
          loadError instanceof Error
            ? loadError.message
            : sw
              ? "Imeshindikana kupakia media za tovuti."
              : "Website media could not be loaded.",
        );
      } finally {
        if (!signal?.aborted) setLoading(false);
      }
    },
    [businessId, canManage, request, sw, workspaceStatus],
  );

  useEffect(() => {
    const controller = new AbortController();
    const initialLoad = window.setTimeout(() => void load(controller.signal), 0);
    return () => {
      window.clearTimeout(initialLoad);
      controller.abort();
    };
  }, [load]);

  async function handleUpload() {
    if (!site || !file || !canManage) return;
    setUploading(true);
    try {
      await request((token) =>
        uploadWebsiteMedia(
          businessId,
          site.id,
          file,
          { en: altEn.trim(), sw: altSw.trim() },
          token,
        ),
      );
      setFile(null);
      setAltEn("");
      setAltSw("");
      notify({
        message: sw ? "Picha imepakiwa." : "Image uploaded.",
        tone: "success",
      });
      await load();
    } catch (uploadError) {
      notify({
        message:
          uploadError instanceof Error
            ? uploadError.message
            : sw
              ? "Imeshindikana kupakia picha."
              : "Image upload failed.",
        tone: "error",
      });
    } finally {
      setUploading(false);
    }
  }

  async function handleDelete(item: WebsiteMedia) {
    if (!site || !canManage) return;
    const confirmed = window.confirm(
      sw ? "Ondoa picha hii kwenye tovuti?" : "Remove this image from the website?",
    );
    if (!confirmed) return;
    setDeletingId(item.id);
    try {
      await request((token) =>
        deleteWebsiteMedia(businessId, site.id, item.id, token),
      );
      setMedia((current) => current.filter((entry) => entry.id !== item.id));
      notify({ message: sw ? "Picha imeondolewa." : "Image removed.", tone: "success" });
    } catch (deleteError) {
      notify({
        message:
          deleteError instanceof Error
            ? deleteError.message
            : sw
              ? "Imeshindikana kuondoa picha."
              : "Image could not be removed.",
        tone: "error",
      });
    } finally {
      setDeletingId(null);
    }
  }

  if (workspaceStatus !== "ready" || loading) {
    return (
      <div className="flex min-h-64 items-center justify-center gap-2 text-sm text-slate-500">
        <Loader2 className="size-4 animate-spin" />
        {sw ? "Inapakia tovuti..." : "Loading website..."}
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
        <h1 className="text-lg font-semibold">{labels.title}</h1>
        <p className="mt-2 text-sm text-slate-500">
          {sw
            ? "Tovuti bado haijaundwa. Muombe msimamizi wa workspace aiunde."
            : "No website exists yet. Ask a workspace manager to create it."}
        </p>
      </section>
    );
  }

  return (
    <div className="space-y-5">
      <section className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">Website</p>
          <h1 className="mt-1 text-2xl font-semibold text-slate-950 dark:text-white">{labels.title}</h1>
          <p className="mt-1 text-sm text-slate-500">{labels.subtitle}</p>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs dark:border-slate-800 dark:bg-slate-950">
          <strong className="block text-slate-900 dark:text-white">{site.display_name}</strong>
          <span className="text-slate-500">/{site.slug}</span>
        </div>
      </section>

      {canManage ? (
        <section className="rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-950 sm:p-5">
          <div className="grid gap-3 md:grid-cols-2">
            <label className="grid gap-1 text-sm font-medium">
              {sw ? "Maelezo ya picha (English)" : "Image description (English)"}
              <input className="h-10 rounded-lg border border-slate-300 bg-transparent px-3 text-sm dark:border-slate-700" onChange={(event) => setAltEn(event.target.value)} value={altEn} />
            </label>
            <label className="grid gap-1 text-sm font-medium">
              {sw ? "Maelezo ya picha (Kiswahili)" : "Image description (Kiswahili)"}
              <input className="h-10 rounded-lg border border-slate-300 bg-transparent px-3 text-sm dark:border-slate-700" onChange={(event) => setAltSw(event.target.value)} value={altSw} />
            </label>
          </div>
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <label className="inline-flex h-9 cursor-pointer items-center gap-2 rounded-lg border border-slate-300 px-3 text-sm font-semibold hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-900">
              <ImagePlus className="size-4" />
              {file?.name ?? (sw ? "Chagua picha" : "Choose image")}
              <input accept="image/jpeg,image/png,image/webp" className="sr-only" onChange={(event) => setFile(event.target.files?.[0] ?? null)} type="file" />
            </label>
            <Button disabled={!file || uploading} onClick={() => void handleUpload()} size="small">
              {uploading ? <Loader2 className="size-4 animate-spin" /> : <ImagePlus className="size-4" />}
              {sw ? "Pakia" : "Upload"}
            </Button>
            <span className="text-xs text-slate-500">JPEG, PNG, WEBP · 10 MB max</span>
          </div>
        </section>
      ) : (
        <p className="rounded-lg border border-blue-200 bg-blue-50 p-3 text-sm text-blue-800 dark:border-blue-900 dark:bg-blue-950/30 dark:text-blue-200">
          {sw ? "Unaweza kuona media lakini huna ruhusa ya kuibadilisha." : "You can view media, but you do not have permission to change it."}
        </p>
      )}

      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-base font-semibold">{sw ? "Picha" : "Images"}</h2>
          <span className="text-xs text-slate-500">{media.length}</span>
        </div>
        {media.length === 0 ? (
          <div className="rounded-lg border border-dashed border-slate-300 bg-white p-10 text-center text-sm text-slate-500 dark:border-slate-700 dark:bg-slate-950">
            {sw ? "Hakuna picha bado." : "No images yet."}
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {media.map((item) => (
              <article className="overflow-hidden rounded-lg border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950" key={item.id}>
                <div aria-label={item.alt_text[locale] || item.alt_text.en || item.original_name} className="aspect-[4/3] bg-slate-100 bg-cover bg-center dark:bg-slate-900" role="img" style={{ backgroundImage: `url(${JSON.stringify(item.public_url).slice(1, -1)})` }} />
                <div className="flex items-start gap-3 p-3">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{item.original_name || (sw ? "Picha" : "Image")}</p>
                    <p className="mt-1 text-xs text-slate-500">{item.width && item.height ? `${item.width} × ${item.height}` : item.mime_type}</p>
                  </div>
                  {canManage ? (
                    <button aria-label={sw ? "Ondoa picha" : "Delete image"} className="inline-flex size-8 items-center justify-center rounded-md text-slate-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/30" disabled={deletingId === item.id} onClick={() => void handleDelete(item)} type="button">
                      {deletingId === item.id ? <Loader2 className="size-4 animate-spin" /> : <Trash2 className="size-4" />}
                    </button>
                  ) : null}
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

export { WebsiteMediaManager };
