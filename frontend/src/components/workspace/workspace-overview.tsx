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

import { Tooltip } from "@/components/global/primitives/tooltip";

const states = [
  { icon: CircleCheck, key: "status", tone: "emerald" },
  { icon: ShieldCheck, key: "role", tone: "blue" },
  { icon: UsersRound, key: "members", tone: "violet" },
  { icon: Inbox, key: "pending", tone: "amber" },
] as const;

const actions = [
  { icon: Building2, key: "business" },
  { icon: UsersRound, key: "members" },
  { icon: MailPlus, key: "invitations" },
  { icon: UserRoundCog, key: "access" },
] as const;

const tones = {
  amber: "border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-200",
  blue: "border-blue-200 bg-blue-50 text-blue-800 dark:border-blue-900 dark:bg-blue-950/30 dark:text-blue-200",
  emerald: "border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-200",
  violet: "border-violet-200 bg-violet-50 text-violet-800 dark:border-violet-900 dark:bg-violet-950/30 dark:text-violet-200",
} as const;

function WorkspaceOverview() {
  const t = useTranslations("WorkspaceOverview");

  return (
    <div className="space-y-8">
      <section className="border-b border-slate-200 pb-6 dark:border-slate-800">
        <p className="text-sm font-medium text-slate-500 dark:text-slate-400">{t("eyebrow")}</p>
        <h2 className="mt-1 text-2xl font-semibold tracking-tight sm:text-3xl">{t("title")}</h2>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600 dark:text-slate-300">{t("description")}</p>
      </section>

      <section aria-labelledby="workspace-state-title">
        <div className="mb-4">
          <h2 className="text-lg font-semibold" id="workspace-state-title">{t("stateTitle")}</h2>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{t("stateDescription")}</p>
        </div>
        <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
          {states.map((item) => {
            const Icon = item.icon;
            return (
              <article className={`min-h-28 rounded-2xl border p-4 ${tones[item.tone]}`} key={item.key}>
                <Icon className="size-5" />
                <p className="mt-5 text-xs font-semibold uppercase tracking-wide opacity-75">{t(`states.${item.key}.label`)}</p>
                <p className="mt-1 text-sm font-semibold">{t(`states.${item.key}.value`)}</p>
              </article>
            );
          })}
        </div>
      </section>

      <section aria-labelledby="workspace-actions-title">
        <div className="mb-4">
          <h2 className="text-lg font-semibold" id="workspace-actions-title">{t("actionsTitle")}</h2>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{t("actionsDescription")}</p>
        </div>
        <div className="divide-y divide-slate-200 overflow-hidden rounded-2xl border border-slate-200 dark:divide-slate-800 dark:border-slate-800">
          {actions.map((item) => {
            const Icon = item.icon;
            return (
              <Tooltip content={t(`actions.${item.key}.tooltip`)} key={item.key} side="top">
                <button
                  className="group flex w-full cursor-not-allowed items-center gap-4 bg-white px-4 py-4 text-left opacity-70 dark:bg-slate-950 sm:px-5"
                  disabled
                  type="button"
                >
                  <span className="inline-flex size-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-700 dark:bg-slate-900 dark:text-slate-200">
                    <Icon className="size-4.5" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-semibold">{t(`actions.${item.key}.title`)}</span>
                    <span className="mt-1 block text-xs leading-5 text-slate-500 dark:text-slate-400">{t(`actions.${item.key}.description`)}</span>
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
