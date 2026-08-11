"use client";

import {
  ArrowUpRight,
  Bell,
  BriefcaseBusiness,
  CircleHelp,
  CreditCard,
  LockKeyhole,
  Settings2,
  Sparkles,
  UserRound,
} from "lucide-react";
import { useTranslations } from "next-intl";

import { DashboardAvatar } from "@/components/dashboard/dashboard-avatar";
import { Tooltip } from "@/components/global/primitives/tooltip";
import { Link } from "@/i18n/navigation";
import { useIdentitySession } from "@/providers/identity/identity-session-provider";
import { useProfile } from "@/providers/profile/profile-provider";
import { useSecurity } from "@/providers/security/security-provider";
import { useNotifications } from "@/providers/notifications/notifications-provider";
import { useWorkspace } from "@/providers/workspace/workspace-provider";
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

const destinationCards = [
  {
    href: "/dashboard/ai",
    icon: Sparkles,
    key: "ai",
  },
  {
    href: "/dashboard/preferences",
    icon: Settings2,
    key: "preferences",
  },
  {
    href: "/dashboard/billing",
    icon: CreditCard,
    key: "billing",
  },
  {
    href: "/dashboard/help",
    icon: CircleHelp,
    key: "help",
  },
] as const;

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
  const { overview } = useProfile();
  const { overview: securityOverview } = useSecurity();
  const { unreadCount } = useNotifications();
  const { businesses, invitations } = useWorkspace();
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
            <Tooltip
              content={t("createBusinessTooltip")}
              side="bottom"
            >
              <Link
                className="inline-flex h-10 items-center justify-center rounded-xl bg-slate-950 px-4 text-sm font-medium text-white transition hover:bg-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-950/30 dark:bg-white dark:text-slate-950 dark:hover:bg-slate-200"
                href="/dashboard/workspaces/create"
              >
                {t("createBusiness")}
              </Link>
            </Tooltip>
            <Tooltip
              content={t("requestAccessTooltip")}
              side="bottom"
            >
              <Link
                className="inline-flex h-10 items-center justify-center rounded-xl border border-slate-200 bg-white px-4 text-sm font-medium transition hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-950/20 dark:border-slate-800 dark:bg-slate-950 dark:hover:bg-slate-900"
                href="/dashboard/workspaces/access"
              >
                {t("requestAccess")}
              </Link>
            </Tooltip>
          </div>
        </div>
      </section>

      <section aria-labelledby="account-state-title">
        <h2
          className="mb-4 text-lg font-semibold"
          id="account-state-title"
        >
          {t("stateTitle")}
        </h2>

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {statusCards.map((item) => {
            const Icon = item.icon;
            const styles = toneStyles[item.tone];
            const securityState =
              item.key === "security" && securityOverview
                ? t("cards.security.state", {
                    count: securityOverview.active_session_count,
                    email: securityOverview.verified_contacts.email
                      ? t("cards.security.verified")
                      : t("cards.security.unverified"),
                  })
                : null;
            const profileState =
              item.key === "profile" && overview
                ? t("cards.profile.progress", {
                    percentage: overview.completion.percentage,
                  })
                : null;
            const notificationState =
              item.key === "notifications"
                ? t("cards.notifications.unread", { count: unreadCount })
                : null;
            const workspaceState =
              item.key === "workspaces"
                ? t("cards.workspaces.state", {
                    businesses: businesses.length,
                    invitations: invitations.length,
                  })
                : null;

            return (
              <Tooltip
                content={t(`cards.${item.key}.tooltip`)}
                key={item.key}
                side="top"
              >
                <Link
                  aria-label={t(`cards.${item.key}.action`)}
                  className="group overflow-hidden rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-navy/40 dark:border-slate-800 dark:bg-slate-950"
                  href={item.href}
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
                        {profileState ?? securityState ?? notificationState ?? workspaceState ?? t(`cards.${item.key}.pending`)}
                      </p>
                    </div>
                    <ArrowUpRight className="size-4 shrink-0 text-slate-400 transition group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
                  </div>
                </Link>
              </Tooltip>
            );
          })}
        </div>
      </section>

      <section
        aria-labelledby="dashboard-destinations-title"
        className="hidden lg:block"
      >
        <h2
          className="mb-4 text-lg font-semibold"
          id="dashboard-destinations-title"
        >
          {t("destinationsTitle")}
        </h2>
        <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
          {destinationCards.map((item) => {
            const Icon = item.icon;

            return (
              <Tooltip
                content={t(`destinations.${item.key}.tooltip`)}
                key={item.key}
                side="top"
              >
                <Link
                  className="group flex min-h-28 items-start gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:border-slate-300 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-navy/40 dark:border-slate-800 dark:bg-slate-950 dark:hover:border-slate-700"
                  href={item.href}
                >
                  <span className="inline-flex size-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-700 dark:bg-slate-900 dark:text-slate-200">
                    <Icon className="size-4.5" />
                  </span>
                  <span className="min-w-0">
                    <span className="block text-sm font-semibold">
                      {t(`destinations.${item.key}.title`)}
                    </span>
                    <span className="mt-1 block text-xs leading-5 text-slate-500 dark:text-slate-400">
                      {t(`destinations.${item.key}.description`)}
                    </span>
                  </span>
                </Link>
              </Tooltip>
            );
          })}
        </div>
      </section>
    </div>
  );
}

export { DashboardOverview };
