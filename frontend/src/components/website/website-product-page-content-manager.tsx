"use client";

import { Loader2, RefreshCw } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

import { Button } from "@/components/global/primitives/button";
import { ProductPageContentEditor } from "@/components/website/product-page-content-editor";
import { useWebsiteRequest } from "@/hooks/website/use-website-request";
import { useNotification } from "@/providers/global/notification-provider";
import { useWorkspace } from "@/providers/workspace/workspace-provider";
import {
  getWebsiteListings,
  getWebsiteMedia,
  getWebsiteSites,
  uploadWebsiteMedia,
} from "@/services/website/website";
import type { WebsiteListing, WebsiteMedia, WebsiteSite } from "@/types/website/website";

type WebsiteProductPageContentManagerProps = {
  businessId: string;
  locale: string;
};

function WebsiteProductPageContentManager({ businessId, locale }: WebsiteProductPageContentManagerProps) {
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
            ? "Maudhui ya bidhaa hayajapakiwa."
            : "Product page content could not be loaded.",
      );
    } finally {
      setLoading(false);
    }
  }, [businessId, request, sw, workspaceStatus]);

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
      notify({
        message: sw
          ? "Picha imepakiwa kwenye galari. Hifadhi maudhui ili kuitumia."
          : "Image uploaded to the gallery. Save the content to use it.",
        tone: "success",
      });
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

  if (loading || workspaceStatus !== "ready") {
    return (
      <div className="flex min-h-48 items-center justify-center rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950">
        <Loader2 className="size-5 animate-spin text-slate-400" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-950 dark:bg-red-950/20 dark:text-red-300">
        <p>{error}</p>
        <Button className="mt-3" onClick={() => void load()} size="small" type="button" variant="outline">
          <RefreshCw className="size-4" />
          {sw ? "Jaribu tena" : "Retry"}
        </Button>
      </div>
    );
  }

  if (!site) {
    return (
      <div className="rounded-xl border border-dashed border-slate-300 bg-white p-6 text-sm text-slate-500 dark:border-slate-700 dark:bg-slate-950">
        {sw
          ? "Unda Website kwanza kabla ya kusimamia maudhui ya kurasa za bidhaa."
          : "Create a Website first before managing product page content."}
      </div>
    );
  }

  if (!listings.length) {
    return (
      <div className="rounded-xl border border-dashed border-slate-300 bg-white p-6 text-sm text-slate-500 dark:border-slate-700 dark:bg-slate-950">
        {sw
          ? "Hakuna bidhaa bado. Unda bidhaa kwenye sehemu ya Bidhaa, kisha rudi hapa kuongeza maudhui ya ukurasa."
          : "There are no products yet. Create a product in Products, then return here to add page content."}
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <section className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-950 sm:p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.12em] text-slate-400">Website</p>
            <h2 className="mt-1 text-xl font-medium text-slate-950 dark:text-white">
              {sw ? "Maudhui ya kurasa za bidhaa" : "Product page content"}
            </h2>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500 dark:text-slate-400">
              {sw
                ? "Ongeza picha ya Gundua, utangulizi na hadi sehemu tano za maelezo kwa kila bidhaa. Picha za sehemu ni za hiari."
                : "Add a Discover image, introduction, and up to five ordered story blocks for each product. Story-block images are optional."}
            </p>
          </div>
          <Button onClick={() => void load()} size="small" type="button" variant="outline">
            <RefreshCw className="size-4" />
            {sw ? "Onyesha upya" : "Refresh"}
          </Button>
        </div>
      </section>

      {listings.map((listing) => (
        <article
          className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-950 sm:p-5"
          key={listing.id}
        >
          <div>
            <h3 className="text-lg font-semibold text-slate-950 dark:text-white">
              {listing.title[sw ? "sw" : "en"] || listing.title.en || listing.title.sw || listing.slug}
            </h3>
            <p className="mt-1 text-xs text-slate-500">
              {listing.brand ? `${listing.brand} · ` : ""}{listing.variants.length} SKU
            </p>
          </div>

          <ProductPageContentEditor
            businessId={businessId}
            canManage={canManage}
            listing={listing}
            media={media}
            onChanged={() => load()}
            onUpload={uploadMedia}
            siteId={site.id}
            sw={sw}
          />
        </article>
      ))}
    </div>
  );
}

export { WebsiteProductPageContentManager };
