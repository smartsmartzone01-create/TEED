"use client";

import { Boxes, LoaderCircle, PackageSearch, Search, X } from "lucide-react";
import { useLocale } from "next-intl";
import { FormEvent, useMemo, useRef, useState } from "react";

import { useRouter } from "@/i18n/navigation";
import { useIdentitySession } from "@/providers/identity/identity-session-provider";
import { isRequestCancelled } from "@/services/global/api-client";
import { searchWorkspace } from "@/services/global/search";
import type {
  WorkspaceSearchData,
  WorkspaceSearchResult,
  WorkspaceSearchSection,
} from "@/types/global/search";

function WorkspaceSearchBar({ businessId }: { businessId: string }) {
  const locale = useLocale();
  const swahili = locale.toLowerCase().startsWith("sw");
  const router = useRouter();
  const { accessToken } = useIdentitySession();
  const requestRef = useRef<AbortController | null>(null);
  const [query, setQuery] = useState("");
  const [data, setData] = useState<WorkspaceSearchData | null>(null);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [failed, setFailed] = useState(false);

  const labels = {
    placeholder: swahili
      ? "Tafuta bidhaa zinazopatikana au stock..."
      : "Search available products or stock...",
    submit: swahili ? "Tafuta" : "Search",
    close: swahili ? "Funga matokeo" : "Close results",
    available: swahili ? "Bidhaa zinazopatikana" : "Available products",
    stock: "Stock",
    noResults: swahili ? "Hakuna matokeo yaliyopatikana." : "No results found.",
    failed: swahili
      ? "Utafutaji haukupatikana. Jaribu tena."
      : "Search is unavailable. Try again.",
    availableStatus: swahili ? "Inapatikana" : "Available",
    draft: swahili ? "Rasimu" : "Draft",
    received: swahili ? "Imepokelewa" : "Received",
  };

  const visibleSections = useMemo(
    () => data?.sections.filter((section) => section.results.length > 0) ?? [],
    [data],
  );

  async function submitSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!accessToken) return;

    requestRef.current?.abort();
    const controller = new AbortController();
    requestRef.current = controller;
    setLoading(true);
    setFailed(false);
    setOpen(true);

    try {
      const response = await searchWorkspace(
        businessId,
        accessToken,
        query,
        "all",
        controller.signal,
      );
      if (!controller.signal.aborted) setData(response.data ?? null);
    } catch (reason) {
      if (!isRequestCancelled(reason)) {
        setData(null);
        setFailed(true);
      }
    } finally {
      if (!controller.signal.aborted) setLoading(false);
    }
  }

  function clearSearch() {
    requestRef.current?.abort();
    setQuery("");
    setData(null);
    setFailed(false);
    setLoading(false);
    setOpen(false);
  }

  function openResult(result: WorkspaceSearchResult) {
    setOpen(false);
    if (result.type === "available_product") {
      router.push(`/workspace/${businessId}/commerce/products`);
      return;
    }
    router.push(`/workspace/${businessId}/commerce/inventory`);
  }

  function sectionLabel(section: WorkspaceSearchSection) {
    return section.key === "available_products" ? labels.available : labels.stock;
  }

  function resultStatus(result: WorkspaceSearchResult) {
    if (result.type === "available_product") {
      const quantity = result.metadata.current_quantity;
      return quantity === undefined
        ? labels.availableStatus
        : `${String(quantity)} ${labels.availableStatus.toLowerCase()}`;
    }
    if (result.status === "draft") return labels.draft;
    if (result.status === "received") return labels.received;
    return result.status;
  }

  return (
    <div className="relative z-30 border-b border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950">
      <div className="mx-auto flex h-12 w-full max-w-384 items-center px-4 sm:px-6 lg:px-8">
        <form className="flex w-full items-center gap-2" onSubmit={submitSearch} role="search">
          <div className="relative min-w-0 flex-1">
            <Search
              aria-hidden="true"
              className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400"
            />
            <input
              aria-label={labels.placeholder}
              autoComplete="off"
              className="h-9 w-full rounded-lg border border-slate-200 bg-slate-50 pl-9 pr-9 text-sm text-slate-950 outline-none transition focus:border-[var(--workspace-primary,var(--brand-navy))] focus:bg-white focus:ring-2 focus:ring-[color-mix(in_srgb,var(--workspace-primary,var(--brand-navy))_15%,transparent)] dark:border-slate-800 dark:bg-slate-900 dark:text-white dark:focus:bg-slate-950"
              onChange={(event) => {
                setQuery(event.target.value);
                if (open) setOpen(false);
              }}
              placeholder={labels.placeholder}
              value={query}
            />
            {query || open ? (
              <button
                aria-label={labels.close}
                className="absolute right-2 top-1/2 inline-flex size-6 -translate-y-1/2 items-center justify-center rounded-md text-slate-400 hover:bg-slate-200 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200"
                onClick={clearSearch}
                type="button"
              >
                <X className="size-3.5" />
              </button>
            ) : null}
          </div>
          <button
            className="inline-flex h-9 shrink-0 items-center justify-center gap-2 rounded-lg bg-[var(--workspace-primary,var(--brand-navy))] px-3 text-sm font-semibold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
            disabled={!accessToken || loading}
            type="submit"
          >
            {loading ? (
              <LoaderCircle className="size-4 animate-spin" />
            ) : (
              <Search className="size-4 sm:hidden" />
            )}
            <span className="hidden sm:inline">{labels.submit}</span>
            <span className="sr-only sm:hidden">{labels.submit}</span>
          </button>
        </form>
      </div>

      {open ? (
        <div className="absolute left-0 right-0 top-full border-b border-slate-200 bg-white shadow-xl dark:border-slate-800 dark:bg-slate-950">
          <div className="mx-auto max-h-[min(32rem,65svh)] w-full max-w-384 overflow-y-auto px-4 py-3 sm:px-6 lg:px-8">
            {loading ? (
              <div className="flex min-h-24 items-center justify-center text-slate-500">
                <LoaderCircle className="size-5 animate-spin" />
              </div>
            ) : failed ? (
              <p className="py-6 text-center text-sm text-slate-500 dark:text-slate-400">
                {labels.failed}
              </p>
            ) : visibleSections.length === 0 ? (
              <p className="py-6 text-center text-sm text-slate-500 dark:text-slate-400">
                {labels.noResults}
              </p>
            ) : (
              <div className="grid gap-4">
                {visibleSections.map((section) => (
                  <section key={section.key}>
                    <div className="mb-1.5 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.06em] text-slate-500 dark:text-slate-400">
                      {section.key === "available_products" ? (
                        <PackageSearch className="size-3.5" />
                      ) : (
                        <Boxes className="size-3.5" />
                      )}
                      <span>{sectionLabel(section)}</span>
                    </div>
                    <div className="grid gap-1">
                      {section.results.map((result) => (
                        <button
                          className="flex w-full items-center justify-between gap-3 rounded-lg px-3 py-2.5 text-left hover:bg-slate-100 dark:hover:bg-slate-900"
                          key={`${result.type}:${result.id}`}
                          onClick={() => openResult(result)}
                          type="button"
                        >
                          <span className="min-w-0">
                            <span className="block truncate text-sm font-semibold text-slate-950 dark:text-white">
                              {result.title}
                            </span>
                            <span className="mt-0.5 block truncate text-xs text-slate-500 dark:text-slate-400">
                              {[result.reference, result.subtitle]
                                .filter(Boolean)
                                .filter((value, index, values) => values.indexOf(value) === index)
                                .join(" · ")}
                            </span>
                          </span>
                          <span className="shrink-0 rounded-full bg-slate-100 px-2 py-1 text-[10px] font-semibold text-slate-600 dark:bg-slate-900 dark:text-slate-300">
                            {resultStatus(result)}
                          </span>
                        </button>
                      ))}
                    </div>
                  </section>
                ))}
              </div>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}

export { WorkspaceSearchBar };
