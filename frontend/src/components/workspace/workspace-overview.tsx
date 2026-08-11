"use client";

import {
  ArrowRight,
  Building2,
  CircleCheck,
  Inbox,
  MailPlus,
  ShieldCheck,
  UserRoundCog,
  UsersRound,
} from "lucide-react";
import { useTranslations } from "next-intl";
import type { CSSProperties } from "react";

import { Tooltip } from "@/components/global/primitives/tooltip";
import styles from "@/styles/workspace/workspace-overview.module.css";

const states = [
  { icon: CircleCheck, key: "status", tone: "navy" },
  { icon: ShieldCheck, key: "role", tone: "orange" },
  { icon: UsersRound, key: "members", tone: "navy" },
  { icon: Inbox, key: "pending", tone: "orange" },
] as const;

const actions = [
  { icon: Building2, key: "business" },
  { icon: UsersRound, key: "members" },
  { icon: MailPlus, key: "invitations" },
  { icon: UserRoundCog, key: "access" },
] as const;

function WorkspaceOverview() {
  const t = useTranslations("WorkspaceOverview");

  return (
    <div className="space-y-8">
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_3px_10px_rgba(15,23,42,0.05)] dark:border-slate-800 dark:bg-slate-950 dark:shadow-[0_3px_10px_rgba(0,0,0,0.18)] sm:p-6">
        <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
          {t("eyebrow")}
        </p>
        <h2 className="mt-1 text-2xl font-semibold tracking-tight sm:text-3xl">
          {t("title")}
        </h2>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600 dark:text-slate-300">
          {t("description")}
        </p>
      </section>

      <section aria-label={t("stateLabel")}>
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
                  <p className="mt-1 text-sm font-semibold">
                    {t(`states.${item.key}.value`)}
                  </p>
                </div>
              </article>
            );
          })}
        </div>
      </section>

      <section aria-labelledby="workspace-actions-title">
        <div className="mb-4">
          <h2 className="text-lg font-semibold" id="workspace-actions-title">
            {t("actionsTitle")}
          </h2>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            {t("actionsDescription")}
          </p>
        </div>
        <div className="divide-y divide-slate-200 overflow-hidden rounded-2xl border border-slate-200 shadow-[0_3px_10px_rgba(15,23,42,0.05)] dark:divide-slate-800 dark:border-slate-800 dark:shadow-[0_3px_10px_rgba(0,0,0,0.18)]">
          {actions.map((item) => {
            const Icon = item.icon;
            return (
              <Tooltip
                content={t(`actions.${item.key}.tooltip`)}
                key={item.key}
                side="top"
              >
                <button
                  className="group flex w-full cursor-not-allowed items-center gap-4 bg-white px-4 py-4 text-left opacity-70 dark:bg-slate-950 sm:px-5"
                  disabled
                  type="button"
                >
                  <span className="inline-flex size-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-700 dark:bg-slate-900 dark:text-slate-200">
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
                </button>
              </Tooltip>
            );
          })}
        </div>
      </section>
    </div>
  );
}

export { WorkspaceOverview };
