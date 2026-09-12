"use client";

import { ExternalLink, Loader2, RefreshCw } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

const configuredPreviewOrigin =
  process.env.NEXT_PUBLIC_STOREFRONT_PREVIEW_URL?.trim().replace(/\/$/, "") ?? "";

type WebsiteHomepageLivePreviewProps = {
  locale: string;
};

function WebsiteHomepageLivePreview({ locale }: WebsiteHomepageLivePreviewProps) {
  const sw = locale === "sw";
  const [previewOrigin, setPreviewOrigin] = useState(configuredPreviewOrigin);
  const [revision, setRevision] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (configuredPreviewOrigin) return;
    const hostname = window.location.hostname;
    if (hostname === "localhost" || hostname === "127.0.0.1") {
      setPreviewOrigin(`${window.location.protocol}//${hostname}:3001`);
    }
  }, []);

  const previewUrl = useMemo(() => {
    if (!previewOrigin) return "";
    return `${previewOrigin}/?preview=workspace&refresh=${revision}`;
  }, [previewOrigin, revision]);

  function refreshPreview() {
    setLoading(true);
    setRevision((current) => current + 1);
  }

  return (
    <section className="min-w-0 overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-4 py-3 dark:border-slate-800 sm:px-5">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-sm font-semibold text-slate-950 dark:text-white">
              {sw ? "Muonekano wa moja kwa moja" : "Live storefront preview"}
            </h2>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2 py-1 text-[11px] font-medium text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
              <span className="size-1.5 rounded-full bg-emerald-500" />
              {sw ? "Moja kwa moja" : "Live"}
            </span>
          </div>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            {sw
              ? "Huu ni storefront halisi. Bonyeza refresh baada ya kuhifadhi mabadiliko ya homepage."
              : "This is the real storefront. Refresh it after saving homepage changes."}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            className="inline-flex h-9 items-center gap-2 rounded-lg border border-slate-300 px-3 text-sm font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-900"
            disabled={!previewUrl}
            onClick={refreshPreview}
            type="button"
          >
            <RefreshCw className="size-4" />
            {sw ? "Onyesha upya" : "Refresh"}
          </button>
          {previewUrl ? (
            <a
              className="inline-flex h-9 items-center gap-2 rounded-lg border border-slate-300 px-3 text-sm font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-900"
              href={previewUrl}
              rel="noreferrer"
              target="_blank"
            >
              <ExternalLink className="size-4" />
              {sw ? "Fungua storefront" : "Open storefront"}
            </a>
          ) : null}
        </div>
      </div>

      {previewUrl ? (
        <div className="relative min-h-[34rem] bg-slate-100 dark:bg-slate-900 sm:min-h-[42rem]">
          {loading ? (
            <div className="absolute inset-0 z-10 flex items-center justify-center gap-2 bg-white/85 text-sm text-slate-500 backdrop-blur-sm dark:bg-slate-950/85">
              <Loader2 className="size-4 animate-spin" />
              {sw ? "Inapakia storefront..." : "Loading storefront..."}
            </div>
          ) : null}
          <iframe
            className="h-[34rem] w-full border-0 bg-white sm:h-[42rem]"
            key={previewUrl}
            onLoad={() => setLoading(false)}
            src={previewUrl}
            title={sw ? "Muonekano wa storefront" : "Storefront live preview"}
          />
        </div>
      ) : (
        <div className="px-5 py-10 text-center">
          <p className="text-sm font-medium text-slate-800 dark:text-slate-200">
            {sw ? "Storefront preview haijasanidiwa." : "Storefront preview is not configured."}
          </p>
          <p className="mx-auto mt-2 max-w-xl text-xs leading-5 text-slate-500 dark:text-slate-400">
            {sw
              ? "Kwa local development, endesha storefront kwenye port 3001. Kwa mazingira mengine, weka NEXT_PUBLIC_STOREFRONT_PREVIEW_URL kwenye frontend."
              : "For local development, run the storefront on port 3001. In other environments, set NEXT_PUBLIC_STOREFRONT_PREVIEW_URL for the frontend."}
          </p>
        </div>
      )}
    </section>
  );
}

export { WebsiteHomepageLivePreview };
