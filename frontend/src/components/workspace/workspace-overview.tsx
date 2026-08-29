"use client";

import {
  ArrowRight,
  Building2,
  MailPlus,
  Settings2,
  ShoppingBag,
  UserRoundCog,
  UsersRound,
} from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import {
  useCallback,
  useEffect,
  useState,
  useSyncExternalStore,
  type CSSProperties,
} from "react";

import { Tooltip } from "@/components/global/primitives/tooltip";
import { Button } from "@/components/global/primitives/button";
import { Link } from "@/i18n/navigation";
import { useWorkspace } from "@/providers/workspace/workspace-provider";
import type { WorkspaceOverviewData } from "@/types/workspace/workspace";

const actions = [
  { icon: Building2, key: "business", path: "profile" },
  { icon: UsersRound, key: "members", path: "members" },
  { icon: MailPlus, key: "invitations", path: "invitations" },
  { icon: UserRoundCog, key: "access", path: "access-requests" },
] as const;

const subscribeToStorage = (onStoreChange: () => void) => {
  window.addEventListener("storage", onStoreChange);
  return () => window.removeEventListener("storage", onStoreChange);
};

const getServerStartedSnapshot = () => false;

function WorkspaceOverview({ businessId }: { businessId: string }) {
  const t = useTranslations("WorkspaceOverview");
  const locale = useLocale();
  const { loadOverview } = useWorkspace();
  const [overview, setOverview] = useState<WorkspaceOverviewData | null>(null);
  const [error, setError] = useState(false);
  const startedStorageKey = `tunakuza:workspace:${businessId}:started`;
  const getStartedSnapshot = useCallback(
    () => window.localStorage.getItem(startedStorageKey) === "1",
    [startedStorageKey],
  );
  const hasStarted = useSyncExternalStore(
    subscribeToStorage,
    getStartedSnapshot,
    getServerStartedSnapshot,
  );

  useEffect(() => {
    const controller = new AbortController();
    const load = async () => {
      try {
        setError(false);
        setOverview(await loadOverview(businessId, controller.signal));
      } catch {
        if (!controller.signal.aborted) setError(true);
      }
    };
    void load();
    const interval = window.setInterval(() => void load(), 30_000);
    return () => {
      controller.abort();
      window.clearInterval(interval);
    };
  }, [businessId, loadOverview]);

  if (error) {
    return (
      <section className="rounded-lg border border-red-200 bg-red-50 p-5 dark:border-red-900 dark:bg-red-950/30">
        <p className="text-sm font-medium text-red-800 dark:text-red-200">{t("loadError")}</p>
        <Button className="mt-3" onClick={() => window.location.reload()} size="small" variant="outline">{t("retry")}</Button>
      </section>
    );
  }

  if (!overview) return <p className="text-sm text-slate-500">{t("loading")}</p>;

  const welcomeLabel =
    locale === "sw"
      ? `Karibu ${overview.business.name}`
      : `Welcome to ${overview.business.name}`;
  const brandedActionStyle = {
    backgroundColor: "var(--workspace-primary, var(--brand-navy))",
  } as CSSProperties;
  const brandedTextStyle = {
    color: "var(--workspace-primary, var(--brand-navy))",
  } as CSSProperties;
  const brandedIconStyle = {
    backgroundColor:
      "color-mix(in srgb, var(--workspace-primary, var(--brand-navy)) 10%, white)",
    color: "var(--workspace-primary, var(--brand-navy))",
  } as CSSProperties;

  const workspaceCards = [
    {
      action: locale === "sw" ? "Fungua uendeshaji" : "Open operations",
      description:
        locale === "sw"
          ? "Mauzo, bidhaa, stoo, marejesho na matumizi ya biashara."
          : "Sales, items, stock, returns and business spending.",
      href: `/workspace/${businessId}/commerce`,
      icon: ShoppingBag,
      signal:
        locale === "sw"
          ? `Biashara ${t(`statuses.${overview.business.status}`).toLowerCase()}`
          : `Commerce ${t(`statuses.${overview.business.status}`).toLowerCase()}`,
      title: locale === "sw" ? "Uendeshaji" : "Operations",
    },
    {
      action: locale === "sw" ? "Simamia timu" : "Manage team",
      description:
        locale === "sw"
          ? "Wanachama, mialiko, maombi ya ufikiaji na ruhusa."
          : "Members, invitations, access requests and permissions.",
      href: `/workspace/${businessId}/members`,
      icon: UsersRound,
      signal:
        locale === "sw"
          ? `${overview.state.active_member_count} wanachama · ${overview.state.pending_action_count} zinazosubiri`
          : `${overview.state.active_member_count} members · ${overview.state.pending_action_count} pending`,
      title: locale === "sw" ? "Usimamizi" : "Administration",
    },
    {
      action: locale === "sw" ? "Mipangilio ya workspace" : "Workspace settings",
      description:
        locale === "sw"
          ? "Wasifu wa biashara, mapendeleo na usalama wa workspace."
          : "Business profile, preferences and workspace security.",
      href: `/workspace/${businessId}/settings`,
      icon: Settings2,
      signal: `${t(`statuses.${overview.business.status}`)} · ${t(`roles.${overview.membership.role}`)}`,
      title: "Workspace",
    },
  ];

  const directoryLabel = hasStarted
    ? locale === "sw"
      ? "Zana zote"
      : "All Tools"
    : locale === "sw"
      ? "Anza sasa"
      : "Start now";

  return (
    <div>
      <section className="mb-4 flex flex-col gap-3 sm:mb-6 sm:flex-row sm:items-center sm:justify-between lg:mb-8">
        <h1 className="text-xl font-semibold tracking-tight text-slate-950 dark:text-white sm:text-2xl">
          {welcomeLabel}
        </h1>
        <Link
          className="inline-flex h-9 w-fit shrink-0 items-center gap-2 rounded-lg px-3.5 text-sm font-semibold text-white transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400/50"
          href={`/workspace/${businessId}/directory`}
          style={brandedActionStyle}
        >
          {directoryLabel}
          <ArrowRight className="size-4" />
        </Link>
      </section>

      <section className="mb-5 overflow-hidden rounded-lg border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950">
        <div className="border-b border-slate-200 px-4 py-4 dark:border-slate-800 sm:px-5">
          <h2 className="text-base font-semibold text-slate-950 dark:text-white sm:text-lg">
            {locale === "sw" ? "Endesha biashara yako na Tunakuza" : "Manage your business with Tunakuza"}
          </h2>
        </div>
        <div className="grid gap-3 p-4 sm:p-5 lg:grid-cols-3">
          {workspaceCards.map((card) => {
            const Icon = card.icon;
            return (
              <article
                className="flex min-h-56 flex-col rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-950"
                key={card.title}
              >
                <span
                  className="inline-flex size-10 items-center justify-center rounded-lg"
                  style={brandedIconStyle}
                >
                  <Icon className="size-5" />
                </span>
                <div className="mt-4">
                  <h3 className="text-sm font-semibold text-slate-950 dark:text-white">
                    {card.title}
                  </h3>
                  <p className="mt-1 text-xs font-medium text-slate-500 dark:text-slate-400">
                    {card.signal}
                  </p>
                  <p className="mt-3 text-sm leading-5 text-slate-600 dark:text-slate-300">
                    {card.description}
                  </p>
                </div>
                <Link
                  className="mt-auto inline-flex w-fit items-center gap-1.5 pt-5 text-sm font-semibold hover:opacity-75"
                  href={card.href}
                  style={brandedTextStyle}
                >
                  {card.action}
                  <ArrowRight className="size-3.5" />
                </Link>
              </article>
            );
          })}
        </div>
      </section>

      <section
        aria-labelledby="workspace-actions-title"
        className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-[0_3px_10px_rgba(15,23,42,0.05)] dark:border-slate-800 dark:bg-slate-950 dark:shadow-[0_3px_10px_rgba(0,0,0,0.18)]"
      >
        <div className="px-4 py-3 sm:px-5">
          <h2 className="text-sm font-semibold text-slate-950 dark:text-white" id="workspace-actions-title">
            {t("actionsTitle")}
          </h2>
        </div>
        <div className="divide-y divide-slate-200 border-t border-slate-200 dark:divide-slate-800 dark:border-slate-800">
          {actions.map((item) => {
            const Icon = item.icon;
            return (
              <Tooltip
                content={t(`actions.${item.key}.tooltip`)}
                key={item.key}
                side="top"
              >
                <Link
                  className="group flex w-full items-center gap-4 bg-white px-4 py-4 text-left transition-colors hover:bg-interactive-highlight dark:bg-slate-950 dark:hover:bg-slate-900 sm:px-5"
                  href={`/workspace/${businessId}/${item.path}`}
                >
                  <span
                    className="inline-flex size-10 shrink-0 items-center justify-center rounded-xl"
                    style={brandedIconStyle}
                  >
                    <Icon className="size-4.5" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-semibold">
                      {t(`actions.${item.key}.title`)}
                    </span>
                    <span className="mt-1 block text-xs leading-5 text-slate-500 dark:text-slate-400">
                      {t(`actions.${item.key}.description`)}
                    </span>
                  </span>
                  <ArrowRight className="size-4 shrink-0 text-slate-400" />
                </Link>
              </Tooltip>
            );
          })}
        </div>
      </section>
    </div>
  );
}

export { WorkspaceOverview };
