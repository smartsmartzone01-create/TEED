"use client";

import {
  ArrowRight,
  Building2,
  CircleCheck,
  Inbox,
  MailPlus,
  Plus,
  ShieldCheck,
  UserRoundCog,
  UsersRound,
} from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { useEffect, useState, type CSSProperties } from "react";

import { Tooltip } from "@/components/global/primitives/tooltip";
import { Button } from "@/components/global/primitives/button";
import { useWorkspace } from "@/providers/workspace/workspace-provider";
import styles from "@/styles/workspace/workspace-overview.module.css";
import type { WorkspaceOverviewData } from "@/types/workspace/workspace";

const states = [
  { icon: CircleCheck, key: "status", tone: "navy" },
  { icon: ShieldCheck, key: "role", tone: "orange" },
  { icon: UsersRound, key: "members", tone: "navy" },
  { icon: Inbox, key: "pending", tone: "orange" },
] as const;

const actions = [
  { icon: Building2, key: "business", path: "profile" },
  { icon: UsersRound, key: "members", path: "members" },
  { icon: MailPlus, key: "invitations", path: "invitations" },
  { icon: UserRoundCog, key: "access", path: "access-requests" },
] as const;

function WorkspaceOverview({ businessId }: { businessId: string }) {
  const t = useTranslations("WorkspaceOverview");
  const directoryT = useTranslations("WorkspaceRefinement.directory");
  const locale = useLocale();
  const { loadOverview } = useWorkspace();
  const [overview, setOverview] = useState<WorkspaceOverviewData | null>(null);
  const [error, setError] = useState(false);

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

  const stateValues = {
    members: t("states.members.count", { count: overview.state.active_member_count }),
    pending: t("states.pending.count", { count: overview.state.pending_action_count }),
    role: t(`roles.${overview.membership.role}`),
    status: t(`statuses.${overview.business.status}`),
  };
  const welcomeLabel =
    locale === "sw"
      ? `Karibu ${overview.business.name}`
      : `Welcome to ${overview.business.name}`;
  const brandedActionStyle = {
    backgroundColor: "var(--workspace-primary, var(--brand-navy))",
  } as CSSProperties;

  return (
    <div>
      <section className="mb-4 flex flex-col gap-3 sm:mb-6 sm:flex-row sm:items-center sm:justify-between lg:mb-8">
        <h1 className="text-xl font-semibold tracking-tight text-slate-950 dark:text-white sm:text-2xl">
          {welcomeLabel}
        </h1>
        <Link
          className="inline-flex h-9 w-fit shrink-0 items-center gap-2 rounded-lg px-3.5 text-sm font-semibold text-white transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400/50"
          href="/dashboard/workspaces/create"
          style={brandedActionStyle}
        >
          <Plus className="size-4" />
          {directoryT("create")}
        </Link>
      </section>

      <section aria-label={t("stateLabel")} className="mb-5">
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 sm:gap-3 xl:grid-cols-4">
          {states.map((item, index) => {
            const Icon = item.icon;
            const animationStyle = {
              "--state-delay": `${index * -0.55}s`,
            } as CSSProperties;

            return (
              <article
                className={[
                  styles.stateCard,
                  item.tone === "orange" ? styles.orange : "",
                ].join(" ")}
                key={item.key}
                style={animationStyle}
              >
                <Icon className={styles.icon} />
                <div className={styles.copy}>
                  <p className="text-xs font-semibold uppercase tracking-wide opacity-75">
                    {t(`states.${item.key}.label`)}
                  </p>
                  <p className="mt-1 text-sm font-semibold">{stateValues[item.key]}</p>
                </div>
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
                  <span className="inline-flex size-10 shrink-0 items-center justify-center rounded-xl bg-interactive-highlight text-slate-700 dark:bg-slate-900 dark:text-slate-200">
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
