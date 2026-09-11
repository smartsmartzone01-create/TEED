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
  label: string;
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
      const key = product.family_id ? `family:${product.family_id}` : `product:${product.id}`;
      const existing = byKey.get(key);
      if (existing) {
        existing.products.push(product);
      } else {
        byKey.set(key, {
          key,
          label: product.family_name || product.name,
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

  async function importGroup(group: CommerceGroup) {
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
          ? `Commerce imeunganishwa. Aina ${created} zimeongezwa.`
          : `Commerce connected. ${created} variant(s) added.`,
        tone: "success",
      });
      await load();
    } catch (importError) {
      notify({
        message:
          importError instanceof Error
            ? importError.message
            : sw
              ? "Imeshindikana kuunganisha Commerce."
              : "Commerce could not be connected.",
        tone: "error",
      });
    } finally {
      setBusyKey(null);
    }
  }

  async function disconnect(product: WebsiteCommerceProduct) {
    if (
      !site ||
      !canManage ||
      !product.website_listing_id ||
      !product.website_variant_id
    ) {
      return;
    }
    if (!window.confirm(sw ? "Tenganisha aina hii na Commerce?" : "Disconnect this variant from Commerce?")) {
      return;
    }
    setBusyKey(product.id);
    try {
      await request((token) =>
        disconnectWebsiteCommerceVariant(
          businessId,
          site.id,
          product.website_listing_id!,
          product.website_variant_id!,
          token,
        ),
      );
      notify({
        message: sw ? "Aina imetenganishwa na Commerce." : "Variant disconnected from Commerce.",
        tone: "success",
      });
      await load();
    } catch (disconnectError) {
      notify({
        message:
          disconnectError instanceof Error
            ? disconnectError.message
            : sw
              ? "Imeshindikana kutenganisha Commerce."
              : "Commerce could not be disconnected.",
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
        <p className="mt-2 text-sm text-slate-500">
          {sw ? "Tovuti haijaundwa bado." : "No Website site exists yet."}
        </p>
      </section>
    );
  }

  if (!canViewCommerce) {
    return (
      <section className="rounded-lg border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-950">
        <h1 className="text-lg font-semibold">{sw ? "Unganisha Commerce" : "Connect Commerce"}</h1>
        <p className="mt-2 text-sm text-slate-500">
          {sw
            ? "Huna ruhusa ya kuona katalogi ya Commerce."
            : "You do not have permission to view the Commerce catalog."}
        </p>
      </section>
    );
  }

  return (
    <div className="space-y-5">
      <header>
        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">Website</p>
        <h1 className="mt-1 text-2xl font-semibold text-slate-950 dark:text-white">
          {sw ? "Unganisha Commerce" : "Connect Commerce"}
        </h1>
        <p className="mt-1 max-w-3xl text-sm text-slate-500">
          {sw
            ? "Chagua familia za bidhaa kutoka Commerce. Website inaendelea kumiliki bei, picha na maudhui yake."
            : "Choose product families from Commerce. Website continues to own its prices, images, and presentation."}
        </p>
      </header>

      {groups.length === 0 ? (
        <div className="rounded-lg border border-dashed border-slate-300 bg-white p-10 text-center text-sm text-slate-500 dark:border-slate-700 dark:bg-slate-950">
          {sw ? "Hakuna bidhaa hai za Commerce." : "No active Commerce products found."}
        </div>
      ) : (
        <div className="space-y-4">
          {groups.map((group) => {
            const connected = group.products.filter((product) => product.linked).length;
            const allConnected = connected === group.products.length;
            return (
              <section
                className="rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-950 sm:p-5"
                key={group.key}
              >
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <h2 className="font-semibold">{group.label}</h2>
                    <p className="mt-1 text-xs text-slate-500">
                      {connected}/{group.products.length} {sw ? "zimeunganishwa" : "connected"}
                    </p>
                  </div>
                  {canManage && !allConnected ? (
                    <Button
                      disabled={busyKey === group.key}
                      onClick={() => void importGroup(group)}
                      size="small"
                    >
                      {busyKey === group.key ? (
                        <Loader2 className="size-4 animate-spin" />
                      ) : (
                        <Plug className="size-4" />
                      )}
                      {sw ? "Unganisha familia" : "Connect family"}
                    </Button>
                  ) : null}
                </div>

                <div className="mt-4 divide-y divide-slate-100 dark:divide-slate-800">
                  {group.products.map((product) => (
                    <div
                      className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center sm:justify-between"
                      key={product.id}
                    >
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-sm font-medium">{product.name}</span>
                          {product.linked ? (
                            <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold uppercase text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-300">
                              {sw ? "Imeunganishwa" : "Connected"}
                            </span>
                          ) : null}
                        </div>
                        <p className="mt-1 text-xs text-slate-500">
                          {[product.sku, product.variant, product.brand].filter(Boolean).join(" · ")}
                        </p>
                      </div>
                      {canManage && product.linked ? (
                        <Button
                          disabled={busyKey === product.id}
                          onClick={() => void disconnect(product)}
                          size="small"
                          variant="outline"
                        >
                          {busyKey === product.id ? (
                            <Loader2 className="size-4 animate-spin" />
                          ) : (
                            <Unplug className="size-4" />
                          )}
                          {sw ? "Tenganisha" : "Disconnect"}
                        </Button>
                      ) : null}
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
