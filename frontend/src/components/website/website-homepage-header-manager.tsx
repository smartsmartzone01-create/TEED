"use client";

import {
  ChevronDown,
  ChevronUp,
  ImagePlus,
  Loader2,
  Plus,
  Save,
  Store,
  Trash2,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";

import { Button } from "@/components/global/primitives/button";
import { WebsiteNavigationDestinationField } from "@/components/website/website-navigation-destination-field";
import { useWebsiteRequest } from "@/hooks/website/use-website-request";
import { useNotification } from "@/providers/global/notification-provider";
import { useWorkspace } from "@/providers/workspace/workspace-provider";
import {
  createWebsiteSite,
  getWebsiteListings,
  getWebsiteSites,
  updateWebsiteSite,
  uploadWebsiteMedia,
} from "@/services/website/website";
import type {
  WebsiteListing,
  WebsiteNavigationSection,
  WebsiteNavigationTarget,
  WebsiteSite,
} from "@/types/website/website";

type WebsiteHomepageHeaderManagerProps = {
  businessId: string;
  locale: string;
};

type HeaderNavigationEntry = {
  id: string;
  label: {
    en: string;
    sw: string;
  };
  target: WebsiteNavigationTarget;
};

type HeaderNavigationItem = HeaderNavigationEntry & {
  children: HeaderNavigationEntry[];
};

const NAVIGATION_SECTIONS = new Set<WebsiteNavigationSection>([
  "hero",
  "popular",
  "services",
  "footer",
]);

function normalizeTarget(
  source: Record<string, unknown>,
  listings: WebsiteListing[],
): WebsiteNavigationTarget {
  const rawTarget =
    source.target && typeof source.target === "object" && !Array.isArray(source.target)
      ? (source.target as Record<string, unknown>)
      : null;

  if (rawTarget) {
    const type = rawTarget.type;
    if (type === "home") return { type: "home" };
    if (type === "shop") return { type: "shop" };
    if (type === "product" && typeof rawTarget.id === "string") {
      return { type: "product", id: rawTarget.id };
    }
    if (
      type === "section" &&
      typeof rawTarget.section === "string" &&
      NAVIGATION_SECTIONS.has(rawTarget.section as WebsiteNavigationSection)
    ) {
      return {
        type: "section",
        section: rawTarget.section as WebsiteNavigationSection,
      };
    }
    if (type === "external" && typeof rawTarget.url === "string") {
      return { type: "external", url: rawTarget.url };
    }
  }

  const href = typeof source.href === "string" ? source.href.trim() : "";
  if (href === "/") return { type: "home" };
  if (href === "/products" || href === "/products/") return { type: "shop" };

  const sectionMatch = href.match(/^\/?#(hero|popular|services|footer)$/);
  if (sectionMatch) {
    return {
      type: "section",
      section: sectionMatch[1] as WebsiteNavigationSection,
    };
  }

  const productMatch = href.match(/^\/products\/([^/?#]+)\/?$/);
  if (productMatch) {
    const listing = listings.find((item) => item.slug === productMatch[1]);
    if (listing) return { type: "product", id: listing.id };
  }

  if (href.startsWith("https://") || href.startsWith("http://")) {
    return { type: "external", url: href };
  }

  return { type: "legacy", href };
}

function normalizeNavigationEntry(
  value: unknown,
  fallbackId: string,
  listings: WebsiteListing[],
): HeaderNavigationEntry | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const source = value as Record<string, unknown>;
  const labelSource =
    source.label && typeof source.label === "object" && !Array.isArray(source.label)
      ? (source.label as Record<string, unknown>)
      : {};

  return {
    id:
      typeof source.id === "string" && source.id.trim()
        ? source.id
        : fallbackId,
    label: {
      en: typeof labelSource.en === "string" ? labelSource.en : "",
      sw: typeof labelSource.sw === "string" ? labelSource.sw : "",
    },
    target: normalizeTarget(source, listings),
  };
}

function normalizeNavigation(
  value: unknown,
  listings: WebsiteListing[],
): HeaderNavigationItem[] {
  if (!Array.isArray(value)) return [];

  return value.flatMap((entry, index) => {
    const normalized = normalizeNavigationEntry(
      entry,
      `nav-${index + 1}`,
      listings,
    );
    if (!normalized) return [];
    const source = entry as Record<string, unknown>;
    const children = Array.isArray(source.children)
      ? source.children.flatMap((child, childIndex) => {
          const normalizedChild = normalizeNavigationEntry(
            child,
            `${normalized.id}-child-${childIndex + 1}`,
            listings,
          );
          return normalizedChild ? [normalizedChild] : [];
        })
      : [];

    return [{ ...normalized, children }];
  });
}

function normalizeHeader(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return value as Record<string, unknown>;
}

function headerLogoUrl(value: unknown): string {
  const header = normalizeHeader(value);
  return typeof header.logoImageUrl === "string" ? header.logoImageUrl : "";
}

function validExternalUrl(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

function validNavigationTarget(
  target: WebsiteNavigationTarget,
  listings: WebsiteListing[],
) {
  if (target.type === "home" || target.type === "shop") return true;
  if (target.type === "section") return NAVIGATION_SECTIONS.has(target.section);
  if (target.type === "product") {
    return Boolean(target.id && listings.some((listing) => listing.id === target.id));
  }
  if (target.type === "external") return validExternalUrl(target.url);
  return Boolean(target.href.trim());
}

function validNavigationEntry(
  item: HeaderNavigationEntry,
  listings: WebsiteListing[],
): boolean {
  return Boolean(
    (item.label.en.trim() || item.label.sw.trim()) &&
      validNavigationTarget(item.target, listings),
  );
}

function resolveTargetHref(
  target: WebsiteNavigationTarget,
  listings: WebsiteListing[],
) {
  if (target.type === "home") return "/";
  if (target.type === "shop") return "/products";
  if (target.type === "section") return `/#${target.section}`;
  if (target.type === "external") return target.url.trim();
  if (target.type === "legacy") return target.href.trim();
  const listing = listings.find((item) => item.id === target.id);
  return listing ? `/products/${listing.slug}` : "";
}

function cleanNavigationEntry(
  item: HeaderNavigationEntry,
  listings: WebsiteListing[],
) {
  return {
    href: resolveTargetHref(item.target, listings),
    id: item.id,
    label: {
      en: item.label.en.trim(),
      sw: item.label.sw.trim(),
    },
    target:
      item.target.type === "legacy"
        ? undefined
        : item.target,
  };
}

function WebsiteHomepageHeaderManager({
  businessId,
  locale,
}: WebsiteHomepageHeaderManagerProps) {
  const sw = locale === "sw";
  const request = useWebsiteRequest();
  const { notify } = useNotification();
  const { businesses, status: workspaceStatus } = useWorkspace();
  const business = businesses.find((item) => item.id === businessId);
  const canManage = Boolean(
    business?.membership.permissions.includes("website.manage"),
  );

  const [site, setSite] = useState<WebsiteSite | null>(null);
  const [listings, setListings] = useState<WebsiteListing[]>([]);
  const [navigation, setNavigation] = useState<HeaderNavigationItem[]>([]);
  const [savedNavigation, setSavedNavigation] = useState("[]");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const dirty = useMemo(
    () => JSON.stringify(navigation) !== savedNavigation,
    [navigation, savedNavigation],
  );
  const logoUrl = headerLogoUrl(site?.header);

  const load = useCallback(
    async (signal?: AbortSignal) => {
      if (workspaceStatus !== "ready") return;
      setLoading(true);
      setError(null);
      try {
        const response = await request((token) =>
          getWebsiteSites(businessId, token, signal),
        );
        let activeSite = response.data?.sites[0] ?? null;
        if (!activeSite && canManage) {
          const created = await request((token) =>
            createWebsiteSite(businessId, token),
          );
          activeSite = created.data ?? null;
        }

        let nextListings: WebsiteListing[] = [];
        if (activeSite) {
          const listingResponse = await request((token) =>
            getWebsiteListings(businessId, activeSite.id, token, signal),
          );
          nextListings = listingResponse.data?.listings ?? [];
        }

        setSite(activeSite);
        setListings(nextListings);
        const nextNavigation = normalizeNavigation(
          activeSite?.navigation,
          nextListings,
        );
        setNavigation(nextNavigation);
        setSavedNavigation(JSON.stringify(nextNavigation));
      } catch (loadError) {
        if (signal?.aborted) return;
        setError(
          loadError instanceof Error
            ? loadError.message
            : sw
              ? "Imeshindikana kupakia mipangilio ya kichwa."
              : "Header settings could not be loaded.",
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

  function updateLinkLabel(
    index: number,
    field: "labelEn" | "labelSw",
    value: string,
  ) {
    setNavigation((current) =>
      current.map((item, itemIndex) =>
        itemIndex === index
          ? {
              ...item,
              label: {
                ...item.label,
                [field === "labelEn" ? "en" : "sw"]: value,
              },
            }
          : item,
      ),
    );
  }

  function updateLinkTarget(index: number, target: WebsiteNavigationTarget) {
    setNavigation((current) =>
      current.map((item, itemIndex) =>
        itemIndex === index ? { ...item, target } : item,
      ),
    );
  }

  function updateSubLinkLabel(
    parentIndex: number,
    childIndex: number,
    field: "labelEn" | "labelSw",
    value: string,
  ) {
    setNavigation((current) =>
      current.map((item, itemIndex) => {
        if (itemIndex !== parentIndex) return item;
        return {
          ...item,
          children: item.children.map((child, index) =>
            index === childIndex
              ? {
                  ...child,
                  label: {
                    ...child.label,
                    [field === "labelEn" ? "en" : "sw"]: value,
                  },
                }
              : child,
          ),
        };
      }),
    );
  }

  function updateSubLinkTarget(
    parentIndex: number,
    childIndex: number,
    target: WebsiteNavigationTarget,
  ) {
    setNavigation((current) =>
      current.map((item, itemIndex) => {
        if (itemIndex !== parentIndex) return item;
        return {
          ...item,
          children: item.children.map((child, index) =>
            index === childIndex ? { ...child, target } : child,
          ),
        };
      }),
    );
  }

  function addLink() {
    if (navigation.length >= 8) return;
    setNavigation((current) => [
      ...current,
      {
        children: [],
        id: `nav-${Date.now()}`,
        label: { en: "", sw: "" },
        target: { type: "home" },
      },
    ]);
  }

  function addSubLink(parentIndex: number) {
    setNavigation((current) =>
      current.map((item, index) => {
        if (index !== parentIndex || item.children.length >= 8) return item;
        return {
          ...item,
          children: [
            ...item.children,
            {
              id: `${item.id}-child-${Date.now()}`,
              label: { en: "", sw: "" },
              target: { type: "home" },
            },
          ],
        };
      }),
    );
  }

  function removeLink(index: number) {
    setNavigation((current) => current.filter((_, itemIndex) => itemIndex !== index));
  }

  function removeSubLink(parentIndex: number, childIndex: number) {
    setNavigation((current) =>
      current.map((item, index) =>
        index === parentIndex
          ? {
              ...item,
              children: item.children.filter(
                (_, itemIndex) => itemIndex !== childIndex,
              ),
            }
          : item,
      ),
    );
  }

  function moveLink(index: number, direction: -1 | 1) {
    setNavigation((current) => {
      const target = index + direction;
      if (target < 0 || target >= current.length) return current;
      const next = [...current];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  }

  function moveSubLink(
    parentIndex: number,
    childIndex: number,
    direction: -1 | 1,
  ) {
    setNavigation((current) =>
      current.map((item, index) => {
        if (index !== parentIndex) return item;
        const target = childIndex + direction;
        if (target < 0 || target >= item.children.length) return item;
        const children = [...item.children];
        [children[childIndex], children[target]] = [
          children[target],
          children[childIndex],
        ];
        return { ...item, children };
      }),
    );
  }

  async function uploadLogo(file: File) {
    if (!site || !canManage) return;
    setUploadingLogo(true);
    try {
      const uploadResponse = await request((token) =>
        uploadWebsiteMedia(
          businessId,
          site.id,
          file,
          {
            en: `${site.display_name} logo`,
            sw: `Nembo ya ${site.display_name}`,
          },
          token,
        ),
      );
      const media = uploadResponse.data;
      if (!media) {
        throw new Error(
          sw ? "Picha ya nembo haikupakiwa." : "Logo image was not uploaded.",
        );
      }

      const nextHeader = {
        ...normalizeHeader(site.header),
        logoImageUrl: media.public_url,
        logoMediaId: media.id,
      };
      const updateResponse = await request((token) =>
        updateWebsiteSite(businessId, site.id, { header: nextHeader }, token),
      );
      setSite(updateResponse.data ?? { ...site, header: nextHeader });
      notify({
        message: sw ? "Nembo imepakiwa na kuhifadhiwa." : "Logo uploaded and saved.",
        tone: "success",
      });
    } catch (uploadError) {
      notify({
        message:
          uploadError instanceof Error
            ? uploadError.message
            : sw
              ? "Imeshindikana kupakia nembo."
              : "Logo could not be uploaded.",
        tone: "error",
      });
    } finally {
      setUploadingLogo(false);
    }
  }

  async function saveNavigation() {
    if (!site || !canManage) return;
    const invalid = navigation.some(
      (item) =>
        !validNavigationEntry(item, listings) ||
        item.children.some((child) => !validNavigationEntry(child, listings)),
    );
    if (invalid) {
      notify({
        message: sw
          ? "Kila kiungo na kiungo kidogo kinahitaji jina na sehemu halali ya kupeleka mteja."
          : "Each link and sublink needs a label and a valid destination.",
        tone: "error",
      });
      return;
    }

    const cleaned = navigation.map((item) => ({
      ...cleanNavigationEntry(item, listings),
      ...(item.children.length
        ? {
            children: item.children.map((child) =>
              cleanNavigationEntry(child, listings),
            ),
          }
        : {}),
    }));

    setSaving(true);
    try {
      const response = await request((token) =>
        updateWebsiteSite(businessId, site.id, { navigation: cleaned }, token),
      );
      const updatedSite = response.data ?? site;
      const nextNavigation = normalizeNavigation(updatedSite.navigation, listings);
      setSite(updatedSite);
      setNavigation(nextNavigation);
      setSavedNavigation(JSON.stringify(nextNavigation));
      notify({
        message: sw ? "Kichwa kimehifadhiwa." : "Header saved.",
        tone: "success",
      });
    } catch (saveError) {
      notify({
        message:
          saveError instanceof Error
            ? saveError.message
            : sw
              ? "Imeshindikana kuhifadhi kichwa."
              : "Header could not be saved.",
        tone: "error",
      });
    } finally {
      setSaving(false);
    }
  }

  if (workspaceStatus !== "ready" || loading) {
    return (
      <article className="flex min-h-40 items-center justify-center gap-2 border-b border-slate-200 p-5 text-sm text-slate-500 dark:border-slate-800">
        <Loader2 className="size-4 animate-spin" />
        {sw ? "Inapakia kichwa..." : "Loading header..."}
      </article>
    );
  }

  if (error) {
    return (
      <article className="border-b border-slate-200 p-5 dark:border-slate-800">
        <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
        <Button className="mt-3" onClick={() => void load()} size="small" variant="outline">
          {sw ? "Jaribu tena" : "Try again"}
        </Button>
      </article>
    );
  }

  return (
    <article className="min-w-0 overflow-hidden border-b border-slate-200 p-4 dark:border-slate-800 sm:p-5">
      <div className="flex min-w-0 gap-4">
        <div className="flex size-10 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-slate-50 text-slate-600 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300">
          <Store className="size-4" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <h3 className="text-sm font-semibold text-slate-950 dark:text-white">
                {sw ? "Kichwa" : "Header"}
              </h3>
              <p className="mt-1 text-sm leading-6 text-slate-500 dark:text-slate-400">
                {sw
                  ? "Chagua sehemu ya Website badala ya kuandika link za API au URL kwa mkono."
                  : "Choose Website destinations instead of typing API paths or storefront URLs by hand."}
              </p>
            </div>
            <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-medium text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
              {sw ? "Inasanidiwa" : "Configurable"}
            </span>
          </div>

          <div className="mt-5 grid min-w-0 gap-4 lg:grid-cols-[minmax(0,15rem)_minmax(0,1fr)]">
            <section className="min-w-0 rounded-lg border border-slate-200 bg-slate-50/60 p-4 dark:border-slate-800 dark:bg-slate-900/40">
              <p className="text-xs font-semibold uppercase tracking-[0.1em] text-slate-400">
                {sw ? "Nembo" : "Logo"}
              </p>
              <div className="mt-3 flex h-20 w-full items-center justify-center overflow-hidden rounded-lg border border-slate-200 bg-white p-2 text-slate-500 dark:border-slate-700 dark:bg-slate-950">
                {logoUrl ? (
                  <img
                    alt={site?.display_name ?? "Website logo"}
                    className="max-h-full max-w-full object-contain"
                    src={logoUrl}
                  />
                ) : (
                  <Store className="size-6" />
                )}
              </div>
              <p className="mt-3 text-sm font-medium text-slate-800 dark:text-slate-200">
                {logoUrl
                  ? sw
                    ? "Nembo ya tovuti"
                    : "Website logo"
                  : sw
                    ? "Ongeza nembo ya tovuti"
                    : "Add website logo"}
              </p>
              <p className="mt-1 text-xs leading-5 text-slate-500">
                {sw
                  ? "PNG, JPEG au WEBP, hadi MB 10. Picha hii itaonekana kwenye kichwa cha storefront."
                  : "PNG, JPEG, or WEBP up to 10 MB. This image will appear in the storefront header."}
              </p>
              {canManage ? (
                <label className="mt-3 inline-flex h-9 cursor-pointer items-center gap-2 rounded-md border border-slate-300 bg-white px-3 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200 dark:hover:bg-slate-900">
                  {uploadingLogo ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <ImagePlus className="size-4" />
                  )}
                  {uploadingLogo
                    ? sw
                      ? "Inapakia..."
                      : "Uploading..."
                    : logoUrl
                      ? sw
                        ? "Badilisha nembo"
                        : "Replace logo"
                      : sw
                        ? "Pakia nembo"
                        : "Upload logo"}
                  <input
                    accept="image/jpeg,image/png,image/webp"
                    className="sr-only"
                    disabled={uploadingLogo}
                    onChange={(event) => {
                      const file = event.currentTarget.files?.[0];
                      event.currentTarget.value = "";
                      if (file) void uploadLogo(file);
                    }}
                    type="file"
                  />
                </label>
              ) : null}
            </section>

            <section className="min-w-0 overflow-hidden rounded-lg border border-slate-200 p-4 dark:border-slate-800">
              <div className="flex min-w-0 flex-wrap items-center justify-between gap-3">
                <div className="min-w-0">
                  <h4 className="text-sm font-semibold text-slate-900 dark:text-white">
                    {sw ? "Viungo vya urambazaji" : "Navigation links"}
                  </h4>
                  <p className="mt-1 text-xs text-slate-500">
                    {sw
                      ? "Chagua Home, Duka, bidhaa, sehemu ya homepage au tovuti ya nje."
                      : "Choose Home, Shop, a Website product, a homepage section, or an external website."}
                  </p>
                </div>
                {canManage ? (
                  <Button
                    disabled={navigation.length >= 8}
                    onClick={addLink}
                    size="small"
                    variant="outline"
                  >
                    <Plus className="size-4" />
                    {sw ? "Ongeza kiungo" : "Add link"}
                  </Button>
                ) : null}
              </div>

              {navigation.length === 0 ? (
                <div className="mt-4 rounded-lg border border-dashed border-slate-300 px-4 py-8 text-center text-sm text-slate-500 dark:border-slate-700">
                  {sw
                    ? "Hakuna viungo bado. Ongeza kiungo cha kwanza cha kichwa."
                    : "No links yet. Add the first header navigation link."}
                </div>
              ) : (
                <div className="mt-4 max-h-[min(60vh,32rem)] space-y-3 overflow-y-auto overscroll-contain pr-1">
                  {navigation.map((item, index) => (
                    <div
                      className="min-w-0 rounded-lg border border-slate-200 bg-slate-50/50 p-3 dark:border-slate-800 dark:bg-slate-900/30"
                      key={item.id}
                    >
                      <div className="grid min-w-0 gap-3 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,1.4fr)_auto]">
                        <label className="grid min-w-0 gap-1 text-xs font-medium text-slate-600 dark:text-slate-300">
                          English
                          <input
                            className="h-9 min-w-0 w-full rounded-md border border-slate-300 bg-white px-2.5 text-sm text-slate-900 outline-none focus:border-slate-500 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                            disabled={!canManage}
                            onChange={(event) =>
                              updateLinkLabel(index, "labelEn", event.target.value)
                            }
                            placeholder="Shop"
                            value={item.label.en}
                          />
                        </label>
                        <label className="grid min-w-0 gap-1 text-xs font-medium text-slate-600 dark:text-slate-300">
                          Kiswahili
                          <input
                            className="h-9 min-w-0 w-full rounded-md border border-slate-300 bg-white px-2.5 text-sm text-slate-900 outline-none focus:border-slate-500 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                            disabled={!canManage}
                            onChange={(event) =>
                              updateLinkLabel(index, "labelSw", event.target.value)
                            }
                            placeholder="Duka"
                            value={item.label.sw}
                          />
                        </label>
                        <WebsiteNavigationDestinationField
                          disabled={!canManage}
                          listings={listings}
                          locale={locale}
                          onChange={(target) => updateLinkTarget(index, target)}
                          value={item.target}
                        />
                        {canManage ? (
                          <div className="flex flex-wrap items-end gap-1">
                            <button
                              aria-label={sw ? "Hamisha juu" : "Move up"}
                              className="inline-flex size-9 items-center justify-center rounded-md border border-slate-300 text-slate-500 hover:bg-white disabled:opacity-30 dark:border-slate-700 dark:hover:bg-slate-950"
                              disabled={index === 0}
                              onClick={() => moveLink(index, -1)}
                              type="button"
                            >
                              <ChevronUp className="size-4" />
                            </button>
                            <button
                              aria-label={sw ? "Hamisha chini" : "Move down"}
                              className="inline-flex size-9 items-center justify-center rounded-md border border-slate-300 text-slate-500 hover:bg-white disabled:opacity-30 dark:border-slate-700 dark:hover:bg-slate-950"
                              disabled={index === navigation.length - 1}
                              onClick={() => moveLink(index, 1)}
                              type="button"
                            >
                              <ChevronDown className="size-4" />
                            </button>
                            <button
                              aria-label={sw ? "Ondoa kiungo" : "Remove link"}
                              className="inline-flex size-9 items-center justify-center rounded-md border border-slate-300 text-slate-400 hover:border-red-200 hover:bg-red-50 hover:text-red-600 dark:border-slate-700 dark:hover:border-red-900 dark:hover:bg-red-950/30"
                              onClick={() => removeLink(index)}
                              type="button"
                            >
                              <Trash2 className="size-4" />
                            </button>
                          </div>
                        ) : null}
                      </div>

                      <div className="mt-3 border-t border-slate-200 pt-3 dark:border-slate-800">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div>
                            <p className="text-xs font-semibold text-slate-700 dark:text-slate-200">
                              {sw ? "Viungo vidogo" : "Sublinks"}
                              <span className="ml-2 font-normal text-slate-400">
                                {item.children.length}/8
                              </span>
                            </p>
                            <p className="mt-0.5 text-[11px] text-slate-500">
                              {sw
                                ? "Kila kiungo kidogo hutumia mfumo huo huo wa kuchagua destination."
                                : "Each dropdown item uses the same Website destination picker."}
                            </p>
                          </div>
                          {canManage ? (
                            <Button
                              disabled={item.children.length >= 8}
                              onClick={() => addSubLink(index)}
                              size="small"
                              variant="outline"
                            >
                              <Plus className="size-3.5" />
                              {sw ? "Ongeza kiungo kidogo" : "Add sublink"}
                            </Button>
                          ) : null}
                        </div>

                        {item.children.length ? (
                          <div className="mt-3 space-y-2">
                            {item.children.map((child, childIndex) => (
                              <div
                                className="min-w-0 rounded-md border border-slate-200 bg-white p-3 dark:border-slate-700 dark:bg-slate-950"
                                key={child.id}
                              >
                                <div className="grid min-w-0 gap-3 sm:grid-cols-2">
                                  <label className="grid min-w-0 gap-1 text-[11px] font-medium text-slate-600 dark:text-slate-300">
                                    English
                                    <input
                                      className="h-9 min-w-0 w-full rounded-md border border-slate-300 bg-white px-2.5 text-sm text-slate-900 outline-none focus:border-slate-500 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                                      disabled={!canManage}
                                      onChange={(event) =>
                                        updateSubLinkLabel(
                                          index,
                                          childIndex,
                                          "labelEn",
                                          event.target.value,
                                        )
                                      }
                                      placeholder="iPhone 16 Series"
                                      value={child.label.en}
                                    />
                                  </label>
                                  <label className="grid min-w-0 gap-1 text-[11px] font-medium text-slate-600 dark:text-slate-300">
                                    Kiswahili
                                    <input
                                      className="h-9 min-w-0 w-full rounded-md border border-slate-300 bg-white px-2.5 text-sm text-slate-900 outline-none focus:border-slate-500 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                                      disabled={!canManage}
                                      onChange={(event) =>
                                        updateSubLinkLabel(
                                          index,
                                          childIndex,
                                          "labelSw",
                                          event.target.value,
                                        )
                                      }
                                      placeholder="iPhone 16 Series"
                                      value={child.label.sw}
                                    />
                                  </label>
                                  <div className="min-w-0 sm:col-span-2">
                                    <WebsiteNavigationDestinationField
                                      disabled={!canManage}
                                      listings={listings}
                                      locale={locale}
                                      onChange={(target) =>
                                        updateSubLinkTarget(
                                          index,
                                          childIndex,
                                          target,
                                        )
                                      }
                                      value={child.target}
                                    />
                                  </div>
                                </div>
                                {canManage ? (
                                  <div className="mt-2 flex justify-end gap-1">
                                    <button
                                      aria-label={sw ? "Hamisha juu" : "Move sublink up"}
                                      className="inline-flex size-8 items-center justify-center rounded-md border border-slate-300 text-slate-500 hover:bg-slate-50 disabled:opacity-30 dark:border-slate-700 dark:hover:bg-slate-900"
                                      disabled={childIndex === 0}
                                      onClick={() =>
                                        moveSubLink(index, childIndex, -1)
                                      }
                                      type="button"
                                    >
                                      <ChevronUp className="size-3.5" />
                                    </button>
                                    <button
                                      aria-label={sw ? "Hamisha chini" : "Move sublink down"}
                                      className="inline-flex size-8 items-center justify-center rounded-md border border-slate-300 text-slate-500 hover:bg-slate-50 disabled:opacity-30 dark:border-slate-700 dark:hover:bg-slate-900"
                                      disabled={childIndex === item.children.length - 1}
                                      onClick={() =>
                                        moveSubLink(index, childIndex, 1)
                                      }
                                      type="button"
                                    >
                                      <ChevronDown className="size-3.5" />
                                    </button>
                                    <button
                                      aria-label={sw ? "Ondoa kiungo kidogo" : "Remove sublink"}
                                      className="inline-flex size-8 items-center justify-center rounded-md border border-slate-300 text-slate-400 hover:border-red-200 hover:bg-red-50 hover:text-red-600 dark:border-slate-700 dark:hover:border-red-900 dark:hover:bg-red-950/30"
                                      onClick={() =>
                                        removeSubLink(index, childIndex)
                                      }
                                      type="button"
                                    >
                                      <Trash2 className="size-3.5" />
                                    </button>
                                  </div>
                                ) : null}
                              </div>
                            ))}
                          </div>
                        ) : null}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {canManage ? (
                <div className="mt-4 flex min-w-0 flex-wrap items-center justify-between gap-3 border-t border-slate-200 pt-4 dark:border-slate-800">
                  <p className="min-w-0 text-xs text-slate-500">
                    {sw
                      ? "Tunakuza huhifadhi identity ya Website resource na hutengeneza link halisi ya storefront yenyewe."
                      : "Tunakuza stores the Website resource identity and resolves the real storefront route automatically."}
                  </p>
                  <Button
                    disabled={!site || !dirty || saving}
                    onClick={() => void saveNavigation()}
                    size="small"
                  >
                    {saving ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : (
                      <Save className="size-4" />
                    )}
                    {sw ? "Hifadhi kichwa" : "Save header"}
                  </Button>
                </div>
              ) : null}
            </section>
          </div>
        </div>
      </div>
    </article>
  );
}

export { WebsiteHomepageHeaderManager };
