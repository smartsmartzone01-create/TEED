"use client";

import { Loader2, Plug, RefreshCw, Unplug } from "lucide-react";
import { useLocale } from "next-intl";
import { useCallback, useEffect, useMemo, useState } from "react";

import { Button } from "@/components/global/primitives/button";
import { useWebsiteRequest } from "@/hooks/website/use-website-request";
import { useNotification } from "@/providers/global/notification-provider";
import { useWorkspace } from "@/providers/workspace/workspace-provider";
import {
  disconnectWebsiteCommerceVariant,
  getWebsiteCommerceCatalog,
  getWebsiteSites,
  importWebsiteCommerceProducts,
} from "@/services/website/website";
import type {
  WebsiteCommerceProduct,
  WebsiteSite,
} from "@/types/website/website";

type CommerceGroup = {
  key: string;
  kind: "family" | "standalone";
  label: string;
  brand: string;
  products: WebsiteCommerceProduct[];
};

function WebsiteCommerceConnectionManager({ businessId }: { businessId: string }) {
  const locale = useLocale();
  const sw = locale === "sw";
  const request = useWebsiteRequest();
  const { notify } = useNotification();
  const { businesses, status: workspaceStatus } = useWorkspace();
  const business = businesses.find((item) => item.id === businessId);
  const permissions = business?.membership.permissions ?? [];
  const canManage = permissions.includes("website.manage");
  const canViewCommerce = permissions.includes("commerce.view");
  const [site, setSite] = useState<WebsiteSite | null>(null);
  const [products, setProducts] = useState<WebsiteCommerceProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyKey, setBusyKey] = useState<string | null>(null);

  const groups = useMemo<CommerceGroup[]>(() => {
    const byKey = new Map<string, CommerceGroup>();
    for (const product of products) {
      const family = Boolean(product.family_id);
      const key = family ? `family:${product.family_id}` : `product:${product.id}`;
      const existing = byKey.get(key);
      if (existing) {
        existing.products.push(product);
      } else {
        byKey.set(key, {
          key,
          kind: family ? "family" : "standalone",
          label: product.family_name || product.name,
          brand: product.brand,
          products: [product],
        });
      }
    }
    return [...byKey.values()];
  }, [products]);

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
        if (!activeSite || !canViewCommerce) {
          setProducts([]);
          return;
        }
        const catalogResponse = await request((token) =>
          getWebsiteCommerceCatalog(businessId, activeSite.id, token, signal),
        );
        setProducts(catalogResponse.data?.products ?? []);
      } catch (loadError) {
        if (signal?.aborted) return;
        setError(
          loadError instanceof Error
            ? loadError.message
            : sw
              ? "Bidhaa za Commerce hazikupakiwa."
              : "Commerce products could not be loaded.",
        );
      } finally {
        if (!signal?.aborted) setLoading(false);
      }
    },
    [businessId, canViewCommerce, request, sw, workspaceStatus],
  );

  useEffect(() => {
    const controller = new AbortController();
    const initialLoad = window.setTimeout(() => void load(controller.signal), 0);
    return () => {
      window.clearTimeout(initialLoad);
      controller.abort();
    };
  }, [load]);

  async function connectGroup(group: CommerceGroup) {
    if (!site || !canManage) return;
    const candidate = group.products.find((product) => !product.linked);
    if (!candidate) return;
    setBusyKey(group.key);
    try {
      const response = await request((token) =>
        importWebsiteCommerceProducts(businessId, site.id, [candidate.id], token),
      );
      const created = response.data?.created_variants ?? 0;
      notify({
        message: sw
          ? created
            ? `Imeunganishwa kwenye Website. SKU ${created} zimeongezwa kama rasimu.`
            : "Imeunganishwa tena kwenye Website. Hali ya uchapishaji inasimamiwa kwenye Products."
          : created
            ? `Connected to Website. ${created} SKU(s) were added as drafts.`
            : "Reconnected to Website. Publishing is managed from Products.",
        tone: "success",
      });
      await load();
    } catch (importError) {
      notify({
        message:
          importError instanceof Error
            ? importError.message
            : sw
              ? "Imeshindikana kuunganisha kwenye Website."
              : "The item could not be connected to Website.",
        tone: "error",
      });
    } finally {
      setBusyKey(null);
    }
  }

  async function removeGroup(group: CommerceGroup) {
    if (!site || !canManage) return;
    const anchor = group.products.find(
      (product) => product.linked && product.website_listing_id && product.website_variant_id,
    );
    if (!anchor?.website_listing_id || !anchor.website_variant_id) return;

    const confirmed = window.confirm(
      sw
        ? `Ondoa ${group.label} kwenye katalogi ya Website? Maudhui ya Website yataifadhiwa, lakini bidhaa haitakuwa ya umma mpaka iunganishwe na kuchapishwa tena.`
        : `Remove ${group.label} from the Website catalog? Website presentation will be preserved, but the item will not be public until it is reconnected and published again.`,
    );
    if (!confirmed) return;

    setBusyKey(group.key);
    try {
      await request((token) =>
        disconnectWebsiteCommerceVariant(
          businessId,
          site.id,
          anchor.website_listing_id!,
          anchor.website_variant_id!,
          token,
        ),
      );
      notify({
        message: sw
          ? "Imeondolewa kwenye katalogi ya Website. Maudhui yake yamehifadhiwa."
          : "Removed from the Website catalog. Its Website presentation was preserved.",
        tone: "success",
      });
      await load();
    } catch (disconnectError) {
      notify({
        message:
          disconnectError instanceof Error
            ? disconnectError.message
            : sw
              ? "Imeshindikana kuondoa kwenye Website."
              : "The item could not be removed from Website.",
        tone: "error",
      });
    } finally {
      setBusyKey(null);
    }
  }

  if (workspaceStatus !== "ready" || loading) {
    return (
      <div className="flex min-h-64 items-center justify-center gap-2 text-sm text-slate-500">
        <Loader2 className="size-4 animate-spin" />
        {sw ? "Inapakia Commerce..." : "Loading Commerce..."}
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
        <h1 className="text-lg font-semibold">{sw ? "Unganisha Commerce" : "Connect Commerce"}</h1>
        <p className="mt-2 text-sm text-slate-500">{sw ? "Tovuti haijaundwa bado." : "No Website site exists yet."}</p>
      </section>
    );
  }

  if (!canViewCommerce) {
    return (
      <section className="rounded-lg border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-950">
        <h1 className="text-lg font-semibold">{sw ? "Unganisha Commerce" : "Connect Commerce"}</h1>
        <p className="mt-2 text-sm text-slate-500">
          {sw ? "Huna ruhusa ya kuona katalogi ya Commerce." : "You do not have permission to view the Commerce catalog."}
        </p>
      </section>
    );
  }

  return (
    <div className="space-y-5">
      <header>
        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">Website</p>
        <h1 className="mt-1 text-2xl font-semibold text-slate-950 dark:text-white">
          {sw ? "Unganisha Commerce" : "Commerce Connection"}
        </h1>
        <p className="mt-1 max-w-3xl text-sm text-slate-500">
          {sw
            ? "Chagua familia au bidhaa binafsi zitakazokuwa sehemu ya katalogi ya Website. Uchapishaji, bei, picha na maudhui yanasimamiwa kwenye Products."
            : "Choose which product families or standalone products belong to the Website catalog. Publishing, prices, images, and presentation are managed from Products."}
        </p>
      </header>

      {groups.length === 0 ? (
        <div className="rounded-lg border border-dashed border-slate-300 bg-white p-10 text-center text-sm text-slate-500 dark:border-slate-700 dark:bg-slate-950">
          {sw ? "Hakuna bidhaa hai za Commerce." : "No active Commerce products found."}
        </div>
      ) : (
        <div className="space-y-3">
          {groups.map((group) => {
            const connectedCount = group.products.filter((product) => product.linked).length;
            const connected = connectedCount === group.products.length;
            const partiallyConnected = connectedCount > 0 && !connected;
            return (
              <section
                className="rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-950 sm:p-5"
                key={group.key}
              >
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="font-semibold text-slate-950 dark:text-white">{group.label}</h2>
                      <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold uppercase text-slate-600 dark:bg-slate-900 dark:text-slate-300">
                        {group.kind === "family" ? (sw ? "Familia" : "Family") : (sw ? "Bidhaa binafsi" : "Standalone")}
                      </span>
                      {connected ? (
                        <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold uppercase text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-300">
                          {sw ? "Kwenye Website" : "Connected"}
                        </span>
                      ) : partiallyConnected ? (
                        <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-semibold uppercase text-amber-700 dark:bg-amber-950/30 dark:text-amber-300">
                          {sw ? "Inahitaji kusawazishwa" : "Needs sync"}
                        </span>
                      ) : null}
                    </div>
                    <p className="mt-1 text-xs text-slate-500">
                      {[group.brand, `${group.products.length} SKU`].filter(Boolean).join(" · ")}
                    </p>
                  </div>

                  {canManage ? (
                    connected ? (
                      <Button
                        disabled={busyKey === group.key}
                        onClick={() => void removeGroup(group)}
                        size="small"
                        variant="outline"
                      >
                        {busyKey === group.key ? <Loader2 className="size-4 animate-spin" /> : <Unplug className="size-4" />}
                        {sw ? "Ondoa kwenye Website" : "Remove from Website"}
                      </Button>
                    ) : (
                      <Button
                        disabled={busyKey === group.key}
                        onClick={() => void connectGroup(group)}
                        size="small"
                      >
                        {busyKey === group.key ? <Loader2 className="size-4 animate-spin" /> : <Plug className="size-4" />}
                        {partiallyConnected
                          ? sw ? "Sawazisha" : "Complete connection"
                          : sw ? "Ongeza kwenye Website" : "Add to Website"}
                      </Button>
                    )
                  ) : null}
                </div>

                <div className="mt-4 divide-y divide-slate-100 rounded-md border border-slate-100 px-3 dark:divide-slate-800 dark:border-slate-800">
                  {group.products.map((product) => (
                    <div className="flex items-center justify-between gap-3 py-2.5" key={product.id}>
                      <div className="min-w-0">
                        <p className="truncate font-mono text-xs font-semibold text-slate-800 dark:text-slate-200">{product.sku}</p>
                        <p className="mt-0.5 truncate text-xs text-slate-500">
                          {[product.variant || product.name, product.tracking_mode].filter(Boolean).join(" · ")}
                        </p>
                      </div>
                      <span className={`text-[11px] font-semibold ${product.linked ? "text-emerald-600 dark:text-emerald-400" : "text-slate-400"}`}>
                        {product.linked ? (sw ? "Imeunganishwa" : "Connected") : (sw ? "Haijaunganishwa" : "Not connected")}
                      </span>
                    </div>
                  ))}
                </div>
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}

export { WebsiteCommerceConnectionManager };
