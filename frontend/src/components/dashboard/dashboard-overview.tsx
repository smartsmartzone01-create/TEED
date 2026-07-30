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
import { Card } from "@/components/global/primitives/card";
import { Link } from "@/i18n/navigation";
import { useIdentitySession } from "@/providers/identity/identity-session-provider";
import type { DashboardDestination } from "@/types/dashboard/navigation";

type OverviewCard = {
  href: DashboardDestination;
  icon: typeof UserRound;
  key: "notifications" | "profile" | "security" | "workspaces";
};

const overviewCards: OverviewCard[] = [
  { href: "/dashboard/profile", icon: UserRound, key: "profile" },
  { href: "/dashboard/security", icon: LockKeyhole, key: "security" },
  {
    href: "/dashboard/notifications",
    icon: Bell,
    key: "notifications",
  },
  {
    href: "/dashboard/workspaces",
    icon: BriefcaseBusiness,
    key: "workspaces",
  },
];

function DashboardOverview() {
  const t = useTranslations("DashboardOverview");
  const { user } = useIdentitySession();
  const accountName = user?.username || user?.email || t("accountFallback");

  return (
    <div className="space-y-6">
      <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-950 sm:p-8">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="max-w-2xl">
            <p className="text-sm font-medium text-brand-orange-accessible dark:text-brand-orange">
              {t("eyebrow")}
            </p>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight sm:text-3xl">
              {t("welcome", { name: accountName })}
            </h2>
            <p className="mt-3 text-sm leading-6 text-slate-600 dark:text-slate-400 sm:text-base">
              {t("description")}
            </p>
          </div>

          <DashboardAvatar
            className="size-16 text-lg sm:size-20 sm:text-xl"
            size="large"
          />
        </div>
      </section>

      <section aria-labelledby="overview-sections-title">
        <div className="mb-4 flex items-end justify-between gap-4">
          <div>
            <h2
              className="text-lg font-semibold"
              id="overview-sections-title"
            >
              {t("sectionsTitle")}
            </h2>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              {t("sectionsDescription")}
            </p>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {overviewCards.map((item) => {
            const Icon = item.icon;

            return (
              <Card
                className="group relative overflow-hidden border-slate-200 bg-white p-5 shadow-sm backdrop-blur-none transition hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md dark:border-slate-800 dark:bg-slate-950 dark:hover:border-slate-700 sm:p-5"
                key={item.key}
              >
                <div className="flex items-start justify-between gap-4">
                  <span className="inline-flex size-10 items-center justify-center rounded-xl bg-slate-100 text-slate-700 dark:bg-slate-900 dark:text-slate-200">
                    <Icon className="size-4.5" />
                  </span>
                  <ArrowUpRight className="size-4 text-slate-400 transition group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-brand-orange" />
                </div>
                <h3 className="mt-5 font-semibold">
                  {t(`cards.${item.key}.title`)}
                </h3>
                <p className="mt-2 text-sm leading-6 text-slate-500 dark:text-slate-400">
                  {t(`cards.${item.key}.description`)}
                </p>
                <Link
                  aria-label={t(`cards.${item.key}.action`)}
                  className="absolute inset-0 rounded-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-navy/40"
                  href={item.href}
                />
              </Card>
            );
          })}
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
        <Card className="border-slate-200 bg-white p-6 shadow-sm backdrop-blur-none dark:border-slate-800 dark:bg-slate-950 sm:p-6">
          <h2 className="font-semibold">{t("status.title")}</h2>
          <div className="mt-5 flex items-center gap-3 rounded-2xl bg-emerald-50 p-4 text-emerald-900 dark:bg-emerald-950/35 dark:text-emerald-200">
            <span className="size-2.5 rounded-full bg-emerald-500" />
            <div>
              <p className="text-sm font-semibold">{t("status.active")}</p>
              <p className="mt-0.5 text-xs opacity-75">
                {t("status.activeDescription")}
              </p>
            </div>
          </div>
        </Card>

        <Card className="border-slate-200 bg-white p-6 shadow-sm backdrop-blur-none dark:border-slate-800 dark:bg-slate-950 sm:p-6">
          <h2 className="font-semibold">{t("quickActions.title")}</h2>
          <div className="mt-4 space-y-2">
            <Link
              className="flex items-center justify-between rounded-xl px-3 py-2.5 text-sm font-medium hover:bg-slate-100 dark:hover:bg-slate-900"
              href="/dashboard/security"
            >
              {t("quickActions.security")}
              <ArrowUpRight className="size-4 text-slate-400" />
            </Link>
            <Link
              className="flex items-center justify-between rounded-xl px-3 py-2.5 text-sm font-medium hover:bg-slate-100 dark:hover:bg-slate-900"
              href="/dashboard/preferences"
            >
              {t("quickActions.preferences")}
              <ArrowUpRight className="size-4 text-slate-400" />
            </Link>
          </div>
        </Card>
      </section>
    </div>
  );
}

export { DashboardOverview };
