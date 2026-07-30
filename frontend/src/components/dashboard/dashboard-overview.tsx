"use client";

import {
  ArrowUpRight,
  Bell,
  BriefcaseBusiness,
  LockKeyhole,
  UserRound,
} from "lucide-react";
import { useTranslations } from "next-intl";

import { DashboardAvatar } from "@/components/dashboard/dashboard-avatar";
import { Link } from "@/i18n/navigation";
import { useIdentitySession } from "@/providers/identity/identity-session-provider";
import type { DashboardDestination } from "@/types/dashboard/navigation";

type StatusCard = {
  href: DashboardDestination;
  icon: typeof UserRound;
  key: "notifications" | "profile" | "security" | "workspaces";
  tone: "blue" | "emerald" | "orange" | "violet";
};

const statusCards: StatusCard[] = [
  {
    href: "/dashboard/profile",
    icon: UserRound,
    key: "profile",
    tone: "blue",
  },
  {
    href: "/dashboard/security",
    icon: LockKeyhole,
    key: "security",
    tone: "emerald",
  },
  {
    href: "/dashboard/workspaces",
    icon: BriefcaseBusiness,
    key: "workspaces",
    tone: "orange",
  },
  {
    href: "/dashboard/notifications",
    icon: Bell,
    key: "notifications",
    tone: "violet",
  },
];

const toneStyles = {
  blue: {
    accent: "bg-blue-500",
    icon: "bg-blue-50 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300",
    ring: "border-blue-200 dark:border-blue-900",
  },
  emerald: {
    accent: "bg-emerald-500",
    icon: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300",
    ring: "border-emerald-200 dark:border-emerald-900",
  },
  orange: {
    accent: "bg-orange-500",
    icon: "bg-orange-50 text-orange-700 dark:bg-orange-950/50 dark:text-orange-300",
    ring: "border-orange-200 dark:border-orange-900",
  },
  violet: {
    accent: "bg-violet-500",
    icon: "bg-violet-50 text-violet-700 dark:bg-violet-950/50 dark:text-violet-300",
    ring: "border-violet-200 dark:border-violet-900",
  },
} as const;

function DashboardOverview() {
  const t = useTranslations("DashboardOverview");
  const { user } = useIdentitySession();
  const accountName = user?.username || user?.email || t("accountFallback");

  return (
    <div className="space-y-6">
      <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-950 sm:p-7">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 items-center gap-4">
            <DashboardAvatar
              className="size-14 text-base sm:size-16 sm:text-lg"
              size="large"
            />
            <h2 className="truncate text-2xl font-semibold tracking-tight sm:text-3xl">
              {t("welcome", { name: accountName })}
            </h2>
          </div>

          <div className="flex flex-wrap gap-2">
            <Link
              className="inline-flex h-10 items-center justify-center rounded-xl bg-slate-950 px-4 text-sm font-medium text-white transition hover:bg-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-950/30 dark:bg-white dark:text-slate-950 dark:hover:bg-slate-200"
              href="/dashboard/workspaces/create"
            >
              {t("createBusiness")}
            </Link>
            <Link
              className="inline-flex h-10 items-center justify-center rounded-xl border border-slate-200 bg-white px-4 text-sm font-medium transition hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-950/20 dark:border-slate-800 dark:bg-slate-950 dark:hover:bg-slate-900"
              href="/dashboard/workspaces/access"
            >
              {t("requestAccess")}
            </Link>
          </div>
        </div>
      </section>

      <section aria-labelledby="account-state-title">
        <div className="mb-4">
          <h2 className="text-lg font-semibold" id="account-state-title">
            {t("stateTitle")}
          </h2>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            {t("stateDescription")}
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {statusCards.map((item) => {
            const Icon = item.icon;
            const styles = toneStyles[item.tone];
            const isIdentityReady =
              item.key === "security" &&
              Boolean(user?.isOnboardingComplete);

            return (
              <article
                className="group relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md dark:border-slate-800 dark:bg-slate-950"
                key={item.key}
              >
                <div className="flex items-start justify-between gap-3">
                  <span
                    className={`inline-flex size-10 items-center justify-center rounded-xl ${styles.icon}`}
                  >
                    <Icon className="size-4.5" />
                  </span>
                  <span
                    className={`relative inline-flex size-10 items-center justify-center rounded-full border-4 ${styles.ring}`}
                  >
                    <span
                      className={`size-2.5 rounded-full ${styles.accent}`}
                    />
                  </span>
                </div>

                <div className="mt-4 flex items-end justify-between gap-3">
                  <div className="min-w-0">
                    <h3 className="truncate text-sm font-semibold">
                      {t(`cards.${item.key}.title`)}
                    </h3>
                    <p className="mt-1 truncate text-xs text-slate-500 dark:text-slate-400">
                      {isIdentityReady
                        ? t("cards.security.ready")
                        : t(`cards.${item.key}.pending`)}
                    </p>
                  </div>
                  <ArrowUpRight className="size-4 shrink-0 text-slate-400 transition group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
                </div>

                <Link
                  aria-label={t(`cards.${item.key}.action`)}
                  className="absolute inset-0 rounded-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-navy/40"
                  href={item.href}
                />
              </article>
            );
          })}
        </div>
      </section>
    </div>
  );
}

export { DashboardOverview };
