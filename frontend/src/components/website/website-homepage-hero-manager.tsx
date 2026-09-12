"use client";

import { ImagePlus, Loader2, Save, Sparkles, Trash2 } from "lucide-react";
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
  WebsiteNavigationTarget,
  WebsiteSite,
} from "@/types/website/website";

type WebsiteHomepageHeroManagerProps = {
  businessId: string;
  locale: string;
};

type LocalizedValue = {
  en: string;
  sw: string;
};

type HeroLayout = "text" | "split";

type HeroDraft = {
  eyebrow: LocalizedValue;
  imageAlt: LocalizedValue;
  imageMediaId: string;
  imageUrl: string;
  layout: HeroLayout;
  primaryAction: LocalizedValue;
  primaryTarget: WebsiteNavigationTarget;
  secondaryAction: LocalizedValue;
  secondaryEnabled: boolean;
  secondaryTarget: WebsiteNavigationTarget;
  subtitle: LocalizedValue;
  title: LocalizedValue;
};

const inputClassName =
  "h-10 min-w-0 w-full rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-900 outline-none focus:border-slate-500 dark:border-slate-700 dark:bg-slate-950 dark:text-white";
const textAreaClassName =
  "min-h-24 min-w-0 w-full resize-y rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-slate-500 dark:border-slate-700 dark:bg-slate-950 dark:text-white";

function objectValue(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return value as Record<string, unknown>;
}

function localizedValue(value: unknown, fallback = ""): LocalizedValue {
  const source = objectValue(value);
  return {
    en: typeof source.en === "string" ? source.en : fallback,
    sw: typeof source.sw === "string" ? source.sw : fallback,
  };
}

function legacyTarget(href: string): WebsiteNavigationTarget {
  if (href === "/") return { type: "home" };
  if (href === "/products") return { type: "shop" };
  if (href === "/#hero") return { type: "section", section: "hero" };
  if (href === "/#popular") return { type: "section", section: "popular" };
  if (href === "/#services") return { type: "section", section: "services" };
  if (href === "/#footer") return { type: "section", section: "footer" };
  if (href.startsWith("https://") || href.startsWith("http://")) {
    return { type: "external", url: href };
  }
  return { type: "legacy", href };
}

function normalizeTarget(value: unknown, href: unknown, fallback: WebsiteNavigationTarget) {
  const target = objectValue(value);
  const type = target.type;
  if (type === "home") return { type: "home" } as WebsiteNavigationTarget;
  if (type === "shop") return { type: "shop" } as WebsiteNavigationTarget;
  if (type === "product" && typeof target.id === "string") {
    return { type: "product", id: target.id } as WebsiteNavigationTarget;
  }
  if (
    type === "section" &&
    (target.section === "hero" ||
      target.section === "popular" ||
      target.section === "services" ||
      target.section === "footer")
  ) {
    return {
      type: "section",
      section: target.section,
    } as WebsiteNavigationTarget;
  }
  if (type === "external" && typeof target.url === "string") {
    return { type: "external", url: target.url } as WebsiteNavigationTarget;
  }
  if (typeof href === "string" && href.trim()) return legacyTarget(href.trim());
  return fallback;
}

function normalizeHero(value: unknown, displayName: string): HeroDraft {
  const source = objectValue(value);
  const imageUrl = typeof source.imageUrl === "string" ? source.imageUrl : "";
  const secondaryAction = localizedValue(source.secondaryAction);
  const secondaryHref = typeof source.secondaryHref === "string" ? source.secondaryHref : "";
  const secondaryTargetValue = source.secondaryTarget;

  return {
    eyebrow: localizedValue(source.eyebrow),
    imageAlt: localizedValue(source.imageAlt, displayName),
    imageMediaId: typeof source.imageMediaId === "string" ? source.imageMediaId : "",
    imageUrl,
    layout:
      source.layout === "text" || source.layout === "split"
        ? source.layout
        : imageUrl
          ? "split"
          : "text",
    primaryAction: localizedValue(source.primaryAction, "Shop now"),
    primaryTarget: normalizeTarget(source.primaryTarget, source.primaryHref, {
      type: "shop",
    }),
    secondaryAction,
    secondaryEnabled: Boolean(
      secondaryAction.en.trim() ||
        secondaryAction.sw.trim() ||
        secondaryHref.trim() ||
        (secondaryTargetValue && typeof secondaryTargetValue === "object"),
    ),
    secondaryTarget: normalizeTarget(
      secondaryTargetValue,
      secondaryHref,
      { type: "section", section: "popular" },
    ),
    subtitle: localizedValue(source.subtitle),
    title: localizedValue(source.title, displayName),
  };
}

function validTarget(target: WebsiteNavigationTarget) {
  if (target.type === "product") return Boolean(target.id);
  if (target.type === "external") {
    return target.url.startsWith("https://") || target.url.startsWith("http://");
  }
  if (target.type === "legacy") return Boolean(target.href.trim());
  return true;
}

function cleanTarget(target: WebsiteNavigationTarget) {
  if (target.type === "external") return { type: "external", url: target.url.trim() };
  if (target.type === "legacy") return null;
  return target;
}

function WebsiteHomepageHeroManager({ businessId, locale }: WebsiteHomepageHeroManagerProps) {
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
  const [hero, setHero] = useState<HeroDraft | null>(null);
  const [savedHero, setSavedHero] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const dirty = useMemo(
    () => Boolean(hero && JSON.stringify(hero) !== savedHero),
    [hero, savedHero],
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
          const created = await request((token) =>
            createWebsiteSite(businessId, token),
          );
          activeSite = created.data ?? null;
        }

        setSite(activeSite);
        if (!activeSite) {
          setHero(null);
          setListings([]);
          return;
        }

        const nextHero = normalizeHero(activeSite.hero, activeSite.display_name);
        setHero(nextHero);
        setSavedHero(JSON.stringify(nextHero));

        const listingResponse = await request((token) =>
          getWebsiteListings(businessId, activeSite.id, token, signal),
        );
        setListings(listingResponse.data?.listings ?? []);
      } catch (loadError) {
        if (signal?.aborted) return;
        setError(
          loadError instanceof Error
            ? loadError.message
            : sw
              ? "Imeshindikana kupakia sehemu kuu."
              : "Hero settings could not be loaded.",
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

  function updateLocalized(
    field: "eyebrow" | "imageAlt" | "primaryAction" | "secondaryAction" | "subtitle" | "title",
    language: "en" | "sw",
    value: string,
  ) {
    setHero((current) =>
      current
        ? {
            ...current,
            [field]: { ...current[field], [language]: value },
          }
        : current,
    );
  }

  async function uploadHeroImage(file: File) {
    if (!site || !hero || !canManage) return;
    setUploadingImage(true);
    try {
      const uploadResponse = await request((token) =>
        uploadWebsiteMedia(
          businessId,
          site.id,
          file,
          {
            en: hero.imageAlt.en.trim() || hero.title.en.trim() || `${site.display_name} hero`,
            sw: hero.imageAlt.sw.trim() || hero.title.sw.trim() || `Picha kuu ya ${site.display_name}`,
          },
          token,
        ),
      );
      const media = uploadResponse.data;
      if (!media) throw new Error(sw ? "Picha haikupakiwa." : "Hero image was not uploaded.");

      setHero((current) =>
        current
          ? {
              ...current,
              imageMediaId: media.id,
              imageUrl: media.public_url,
              layout: "split",
            }
          : current,
      );
      notify({
        message: sw
          ? "Picha imepakiwa. Hifadhi Hero ili kuitumia."
          : "Image uploaded. Save Hero to use it.",
        tone: "success",
      });
    } catch (uploadError) {
      notify({
        message:
          uploadError instanceof Error
            ? uploadError.message
            : sw
              ? "Imeshindikana kupakia picha."
              : "Hero image could not be uploaded.",
        tone: "error",
      });
    } finally {
      setUploadingImage(false);
    }
  }

  async function saveHero() {
    if (!site || !hero || !canManage) return;
    if (!hero.title.en.trim() && !hero.title.sw.trim()) {
      notify({
        message: sw ? "Hero inahitaji kichwa kikuu." : "Hero needs a headline.",
        tone: "error",
      });
      return;
    }
    if (
      (!hero.primaryAction.en.trim() && !hero.primaryAction.sw.trim()) ||
      !validTarget(hero.primaryTarget)
    ) {
      notify({
        message: sw
          ? "Kitufe kikuu kinahitaji jina na sehemu halali ya kwenda."
          : "The primary button needs a label and a valid destination.",
        tone: "error",
      });
      return;
    }
    if (
      hero.secondaryEnabled &&
      ((!hero.secondaryAction.en.trim() && !hero.secondaryAction.sw.trim()) ||
        !validTarget(hero.secondaryTarget))
    ) {
      notify({
        message: sw
          ? "Kitufe cha pili kinahitaji jina na sehemu halali ya kwenda."
          : "The secondary button needs a label and a valid destination.",
        tone: "error",
      });
      return;
    }

    const primaryTarget = cleanTarget(hero.primaryTarget);
    const secondaryTarget = cleanTarget(hero.secondaryTarget);
    const payload: Record<string, unknown> = {
      backgroundPreset: "sky-white",
      eyebrow: {
        en: hero.eyebrow.en.trim(),
        sw: hero.eyebrow.sw.trim(),
      },
      imageAlt: {
        en: hero.imageAlt.en.trim(),
        sw: hero.imageAlt.sw.trim(),
      },
      imageMediaId: hero.imageMediaId,
      imageUrl: hero.imageUrl,
      layout: hero.layout,
      primaryAction: {
        en: hero.primaryAction.en.trim(),
        sw: hero.primaryAction.sw.trim(),
      },
      subtitle: {
        en: hero.subtitle.en.trim(),
        sw: hero.subtitle.sw.trim(),
      },
      title: {
        en: hero.title.en.trim(),
        sw: hero.title.sw.trim(),
      },
    };

    if (primaryTarget) payload.primaryTarget = primaryTarget;
    if (hero.primaryTarget.type === "legacy") payload.primaryHref = hero.primaryTarget.href.trim();

    if (hero.secondaryEnabled) {
      payload.secondaryAction = {
        en: hero.secondaryAction.en.trim(),
        sw: hero.secondaryAction.sw.trim(),
      };
      if (secondaryTarget) payload.secondaryTarget = secondaryTarget;
      if (hero.secondaryTarget.type === "legacy") {
        payload.secondaryHref = hero.secondaryTarget.href.trim();
      }
    }

    setSaving(true);
    try {
      const response = await request((token) =>
        updateWebsiteSite(businessId, site.id, { hero: payload }, token),
      );
      const updatedSite = response.data ?? { ...site, hero: payload };
      const nextHero = normalizeHero(updatedSite.hero, updatedSite.display_name);
      setSite(updatedSite);
      setHero(nextHero);
      setSavedHero(JSON.stringify(nextHero));
      notify({
        message: sw ? "Hero imehifadhiwa." : "Hero saved.",
        tone: "success",
      });
    } catch (saveError) {
      notify({
        message:
          saveError instanceof Error
            ? saveError.message
            : sw
              ? "Imeshindikana kuhifadhi Hero."
              : "Hero could not be saved.",
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
        {sw ? "Inapakia Hero..." : "Loading Hero..."}
      </article>
    );
  }

  if (error || !hero) {
    return (
      <article className="border-b border-slate-200 p-5 dark:border-slate-800">
        <p className="text-sm text-red-700 dark:text-red-300">
          {error ?? (sw ? "Hero haipatikani." : "Hero is unavailable.")}
        </p>
        <Button className="mt-3" onClick={() => void load()} size="small" variant="outline">
          {sw ? "Jaribu tena" : "Try again"}
        </Button>
      </article>
    );
  }

  return (
    <article className="min-w-0 overflow-hidden border-b border-slate-200 p-4 dark:border-slate-800 sm:p-5">
      <div className="flex min-w-0 gap-4">
        <div className="flex size-10 shrink-0 items-center justify-center rounded-lg border border-sky-200 bg-gradient-to-br from-sky-100 to-white text-sky-700 dark:border-sky-900 dark:from-sky-950 dark:to-slate-950 dark:text-sky-300">
          <Sparkles className="size-4" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <h3 className="text-sm font-semibold text-slate-950 dark:text-white">
                {sw ? "Sehemu kuu" : "Hero"}
              </h3>
              <p className="mt-1 text-sm leading-6 text-slate-500 dark:text-slate-400">
                {sw
                  ? "Hariri ujumbe mkuu, vitufe na picha ya kwanza ambayo mteja anaona."
                  : "Edit the main message, buttons, and optional image customers see first."}
              </p>
            </div>
            <span className="rounded-full bg-sky-50 px-2.5 py-1 text-[11px] font-medium text-sky-700 dark:bg-sky-950/40 dark:text-sky-300">
              {sw ? "Sky blue → nyeupe" : "Sky blue → white"}
            </span>
          </div>

          <div className="mt-5 grid min-w-0 gap-4 xl:grid-cols-[minmax(0,1fr)_18rem]">
            <section className="min-w-0 rounded-lg border border-slate-200 p-4 dark:border-slate-800">
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="grid gap-1 text-xs font-medium text-slate-600 dark:text-slate-300">
                  {sw ? "Eyebrow (English)" : "Eyebrow (English)"}
                  <input className={inputClassName} disabled={!canManage} onChange={(event) => updateLocalized("eyebrow", "en", event.target.value)} placeholder="New collection" value={hero.eyebrow.en} />
                </label>
                <label className="grid gap-1 text-xs font-medium text-slate-600 dark:text-slate-300">
                  Eyebrow (Kiswahili)
                  <input className={inputClassName} disabled={!canManage} onChange={(event) => updateLocalized("eyebrow", "sw", event.target.value)} placeholder="Mkusanyiko mpya" value={hero.eyebrow.sw} />
                </label>
                <label className="grid gap-1 text-xs font-medium text-slate-600 dark:text-slate-300">
                  {sw ? "Kichwa (English)" : "Headline (English)"}
                  <input className={inputClassName} disabled={!canManage} onChange={(event) => updateLocalized("title", "en", event.target.value)} placeholder="Everything you need for your next upgrade" value={hero.title.en} />
                </label>
                <label className="grid gap-1 text-xs font-medium text-slate-600 dark:text-slate-300">
                  {sw ? "Kichwa (Kiswahili)" : "Headline (Kiswahili)"}
                  <input className={inputClassName} disabled={!canManage} onChange={(event) => updateLocalized("title", "sw", event.target.value)} placeholder="Kila unachohitaji kwa hatua inayofuata" value={hero.title.sw} />
                </label>
                <label className="grid gap-1 text-xs font-medium text-slate-600 dark:text-slate-300">
                  {sw ? "Maelezo (English)" : "Supporting text (English)"}
                  <textarea className={textAreaClassName} disabled={!canManage} onChange={(event) => updateLocalized("subtitle", "en", event.target.value)} placeholder="Tell customers what makes this offer or collection useful." value={hero.subtitle.en} />
                </label>
                <label className="grid gap-1 text-xs font-medium text-slate-600 dark:text-slate-300">
                  {sw ? "Maelezo (Kiswahili)" : "Supporting text (Kiswahili)"}
                  <textarea className={textAreaClassName} disabled={!canManage} onChange={(event) => updateLocalized("subtitle", "sw", event.target.value)} placeholder="Waeleze wateja kinachofanya ofa hii kuwa muhimu." value={hero.subtitle.sw} />
                </label>
              </div>

              <div className="mt-5 border-t border-slate-200 pt-4 dark:border-slate-800">
                <h4 className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-400">
                  {sw ? "Kitufe kikuu" : "Primary button"}
                </h4>
                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  <input aria-label="Primary button English" className={inputClassName} disabled={!canManage} onChange={(event) => updateLocalized("primaryAction", "en", event.target.value)} placeholder="Shop now" value={hero.primaryAction.en} />
                  <input aria-label="Primary button Kiswahili" className={inputClassName} disabled={!canManage} onChange={(event) => updateLocalized("primaryAction", "sw", event.target.value)} placeholder="Nunua sasa" value={hero.primaryAction.sw} />
                </div>
                <div className="mt-3">
                  <WebsiteNavigationDestinationField disabled={!canManage} listings={listings} locale={locale} onChange={(primaryTarget) => setHero((current) => current ? { ...current, primaryTarget } : current)} value={hero.primaryTarget} />
                </div>
              </div>

              <div className="mt-5 border-t border-slate-200 pt-4 dark:border-slate-800">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <h4 className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-400">
                      {sw ? "Kitufe cha pili" : "Secondary button"}
                    </h4>
                    <p className="mt-1 text-xs text-slate-500">
                      {sw ? "Hiari — tumia kwa hatua ya pili." : "Optional — use it for a second customer action."}
                    </p>
                  </div>
                  <label className="flex items-center gap-2 text-xs font-medium text-slate-600 dark:text-slate-300">
                    <input checked={hero.secondaryEnabled} disabled={!canManage} onChange={(event) => setHero((current) => current ? { ...current, secondaryEnabled: event.target.checked } : current)} type="checkbox" />
                    {sw ? "Onyesha" : "Show"}
                  </label>
                </div>
                {hero.secondaryEnabled ? (
                  <div className="mt-3">
                    <div className="grid gap-3 sm:grid-cols-2">
                      <input aria-label="Secondary button English" className={inputClassName} disabled={!canManage} onChange={(event) => updateLocalized("secondaryAction", "en", event.target.value)} placeholder="Learn more" value={hero.secondaryAction.en} />
                      <input aria-label="Secondary button Kiswahili" className={inputClassName} disabled={!canManage} onChange={(event) => updateLocalized("secondaryAction", "sw", event.target.value)} placeholder="Jifunze zaidi" value={hero.secondaryAction.sw} />
                    </div>
                    <div className="mt-3">
                      <WebsiteNavigationDestinationField disabled={!canManage} listings={listings} locale={locale} onChange={(secondaryTarget) => setHero((current) => current ? { ...current, secondaryTarget } : current)} value={hero.secondaryTarget} />
                    </div>
                  </div>
                ) : null}
              </div>
            </section>

            <section className="min-w-0 space-y-4">
              <div className="rounded-lg border border-slate-200 p-4 dark:border-slate-800">
                <h4 className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-400">
                  {sw ? "Mpangilio" : "Layout"}
                </h4>
                <div className="mt-3 grid gap-2">
                  <label className="flex cursor-pointer items-start gap-3 rounded-md border border-slate-200 p-3 dark:border-slate-800">
                    <input checked={hero.layout === "text"} disabled={!canManage} name="hero-layout" onChange={() => setHero((current) => current ? { ...current, layout: "text" } : current)} type="radio" />
                    <span>
                      <span className="block text-sm font-medium text-slate-800 dark:text-slate-200">{sw ? "Maandishi pekee" : "Text only"}</span>
                      <span className="mt-0.5 block text-xs text-slate-500">{sw ? "Maandishi yatatumia nafasi kubwa ya Hero." : "Copy gets the full visual focus."}</span>
                    </span>
                  </label>
                  <label className="flex cursor-pointer items-start gap-3 rounded-md border border-slate-200 p-3 dark:border-slate-800">
                    <input checked={hero.layout === "split"} disabled={!canManage} name="hero-layout" onChange={() => setHero((current) => current ? { ...current, layout: "split" } : current)} type="radio" />
                    <span>
                      <span className="block text-sm font-medium text-slate-800 dark:text-slate-200">{sw ? "Maandishi + picha" : "Text + image"}</span>
                      <span className="mt-0.5 block text-xs text-slate-500">{sw ? "Maandishi kushoto, picha upande wa kulia." : "Copy on the left, image on the right."}</span>
                    </span>
                  </label>
                </div>
              </div>

              <div className="rounded-lg border border-slate-200 p-4 dark:border-slate-800">
                <h4 className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-400">
                  {sw ? "Picha ya Hero" : "Hero image"}
                </h4>
                <div className="mt-3 flex min-h-36 items-center justify-center overflow-hidden rounded-lg border border-dashed border-slate-300 bg-gradient-to-br from-sky-100 via-sky-50 to-white p-3 dark:border-slate-700 dark:from-sky-950 dark:via-slate-950 dark:to-slate-950">
                  {hero.imageUrl ? (
                    <img alt={hero.imageAlt.en || hero.imageAlt.sw || site.display_name} className="max-h-44 max-w-full object-contain" src={hero.imageUrl} />
                  ) : (
                    <div className="text-center text-slate-400">
                      <ImagePlus className="mx-auto size-7" />
                      <p className="mt-2 text-xs">{sw ? "Hakuna picha" : "No image yet"}</p>
                    </div>
                  )}
                </div>
                <div className="mt-3 grid gap-2">
                  <input className={inputClassName} disabled={!canManage} onChange={(event) => updateLocalized("imageAlt", "en", event.target.value)} placeholder="Image description (English)" value={hero.imageAlt.en} />
                  <input className={inputClassName} disabled={!canManage} onChange={(event) => updateLocalized("imageAlt", "sw", event.target.value)} placeholder="Maelezo ya picha (Kiswahili)" value={hero.imageAlt.sw} />
                </div>
                {canManage ? (
                  <div className="mt-3 flex flex-wrap gap-2">
                    <label className="inline-flex h-9 cursor-pointer items-center gap-2 rounded-md border border-slate-300 bg-white px-3 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200 dark:hover:bg-slate-900">
                      {uploadingImage ? <Loader2 className="size-4 animate-spin" /> : <ImagePlus className="size-4" />}
                      {uploadingImage ? (sw ? "Inapakia..." : "Uploading...") : hero.imageUrl ? (sw ? "Badilisha picha" : "Replace image") : (sw ? "Pakia picha" : "Upload image")}
                      <input accept="image/jpeg,image/png,image/webp" className="sr-only" disabled={uploadingImage} onChange={(event) => { const file = event.currentTarget.files?.[0]; event.currentTarget.value = ""; if (file) void uploadHeroImage(file); }} type="file" />
                    </label>
                    {hero.imageUrl ? (
                      <Button onClick={() => setHero((current) => current ? { ...current, imageMediaId: "", imageUrl: "", layout: "text" } : current)} size="small" variant="outline">
                        <Trash2 className="size-4" />
                        {sw ? "Ondoa" : "Remove"}
                      </Button>
                    ) : null}
                  </div>
                ) : null}
              </div>
            </section>
          </div>

          {canManage ? (
            <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 pt-4 dark:border-slate-800">
              <p className="text-xs text-slate-500">
                {sw
                  ? "Hero hutumia gradient salama ya sky blue hadi nyeupe. Refresh live preview baada ya kuhifadhi."
                  : "Hero uses the safe sky-blue-to-white gradient. Refresh the live preview after saving."}
              </p>
              <Button disabled={!dirty || saving} onClick={() => void saveHero()} size="small">
                {saving ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
                {sw ? "Hifadhi Hero" : "Save Hero"}
              </Button>
            </div>
          ) : null}
        </div>
      </div>
    </article>
  );
}

export { WebsiteHomepageHeroManager };
