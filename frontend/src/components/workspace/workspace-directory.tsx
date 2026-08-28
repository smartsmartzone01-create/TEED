"use client";

import {
  ArrowRight,
  BriefcaseBusiness,
  Check,
  LayoutDashboard,
  Mail,
  RefreshCw,
  UserRound,
  X,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { useMemo, useState } from "react";

import { Button } from "@/components/global/primitives/button";
import { BusinessIcon } from "@/components/workspace/business-icon";
import { Link } from "@/i18n/navigation";
import { useNotification } from "@/providers/global/notification-provider";
import { useWorkspace } from "@/providers/workspace/workspace-provider";
import type { WorkspaceBusinessListItem } from "@/types/workspace/workspace";
import { workspaceClassForType } from "@/utils/workspace/workspace-class";

type WorkspaceDirectoryProps = {
  surface?: "dashboard" | "standalone";
};

const primaryActionClassName =
  "inline-flex h-10 items-center justify-center rounded-xl bg-slate-950 px-4 text-sm font-medium text-white transition hover:bg-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-950/30 dark:bg-white dark:text-slate-950 dark:hover:bg-slate-200";
const secondaryActionClassName =
  "inline-flex h-10 items-center justify-center rounded-xl border border-slate-200 bg-white px-4 text-sm font-medium transition hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-950/20 dark:border-slate-800 dark:bg-slate-950 dark:hover:bg-slate-900";

function WorkspaceCard({
  business,
  personal,
}: {
  business: WorkspaceBusinessListItem;
  personal: boolean;
}) {
  const t = useTranslations("WorkspaceRefinement.directory");
  const href =
    business.status === "active"
      ? `/workspace/${business.id}`
      : `/dashboard/workspaces/${business.id}/lifecycle`;

  return (
    <Link
      aria-label={t("open", { name: business.name })}
      className="group relative overflow-hidden rounded-3xl border border-slate-200 bg-white p-5 shadow-sm transition duration-200 hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-navy/30 dark:border-slate-800 dark:bg-slate-950 dark:hover:border-slate-700"
      href={href}
    >
      <span
        aria-hidden="true"
        className="absolute inset-x-0 top-0 h-1"
        style={{
          background: `linear-gradient(90deg, ${business.primary_brand_color}, ${business.secondary_brand_color})`,
        }}
      />

      <span className="flex items-start gap-4">
        <BusinessIcon
          className="size-12 shrink-0 rounded-2xl"
          logoUrl={business.logo_url}
          name={business.name}
          primaryColor={business.primary_brand_color}
          secondaryColor={business.secondary_brand_color}
        />

        <span className="min-w-0 flex-1">
          <span className="flex items-start justify-between gap-3">
            <span className="min-w-0">
              <span className="flex flex-wrap items-center gap-2">
                <strong className="truncate text-base font-semibold tracking-tight">
                  {business.name}
                </strong>
                <span className="rounded-full bg-slate-100 px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-slate-600 dark:bg-slate-900 dark:text-slate-300">
                  {personal
                    ? t("personalClass")
                    : business.workspace_type === "service"
                      ? t("legacyService")
                      : t("businessClass")}
                </span>
                {personal ? (
                  <span className="rounded-full border border-slate-200 px-2 py-1 text-[10px] font-semibold text-slate-500 dark:border-slate-800 dark:text-slate-400">
                    {t("ownerOnly")}
                  </span>
                ) : null}
              </span>
              <span className="mt-1.5 block truncate text-xs font-medium text-brand-navy dark:text-brand-orange">
                @{business.public_handle}
              </span>
            </span>

            <span className="inline-flex size-9 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-slate-50 text-slate-500 transition group-hover:border-slate-300 group-hover:bg-slate-100 group-hover:text-slate-950 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400 dark:group-hover:text-white">
              <ArrowRight className="size-4 transition group-hover:translate-x-0.5" />
            </span>
          </span>

          <span className="mt-4 flex items-center justify-between gap-3 border-t border-slate-100 pt-3 text-xs text-slate-500 dark:border-slate-900 dark:text-slate-400">
            <span>{business.country_code || "—"}</span>
            <span className="font-medium text-slate-700 dark:text-slate-300">
              {t(`roles.${business.membership.role}`)}
            </span>
          </span>
        </span>
      </span>
    </Link>
  );
}

function DirectoryActions({ standalone }: { standalone: boolean }) {
  const t = useTranslations("WorkspaceRefinement.directory");

  return (
    <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
      <Link className={primaryActionClassName} href="/dashboard/workspaces/create">
        {t("create")}
      </Link>
      <Link className={secondaryActionClassName} href="/dashboard/workspaces/access">
        {t("request")}
      </Link>
      {standalone ? (
        <Link
          className="inline-flex h-10 items-center justify-center gap-2 rounded-xl px-4 text-sm font-medium text-slate-600 transition hover:bg-slate-100 hover:text-slate-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-950/20 dark:text-slate-300 dark:hover:bg-slate-900 dark:hover:text-white sm:col-span-2 lg:col-span-1 xl:col-span-2"
          href="/dashboard"
        >
          <LayoutDashboard className="size-4" />
          {t("personalDashboard")}
        </Link>
      ) : null}
    </div>
  );
}

function WorkspaceDirectory({ surface = "standalone" }: WorkspaceDirectoryProps) {
  const t = useTranslations("WorkspaceRefinement.directory");
  const { notify } = useNotification();
  const { businesses, decideInvitation, error, invitations, refresh, status } =
    useWorkspace();
  const [decidingId, setDecidingId] = useState<string | null>(null);

  const { businessWorkspaces, personalWorkspaces } = useMemo(() => {
    const businessItems: WorkspaceBusinessListItem[] = [];
    const personalItems: WorkspaceBusinessListItem[] = [];
    businesses.forEach((business) => {
      if (workspaceClassForType(business.workspace_type) === "personal") {
        personalItems.push(business);
      } else {
        businessItems.push(business);
      }
    });
    return { businessWorkspaces: businessItems, personalWorkspaces: personalItems };
  }, [businesses]);

  async function handleDecision(id: string, decision: "accept" | "decline") {
    setDecidingId(id);
    try {
      await decideInvitation(id, decision);
      notify({
        message: t(`invitation.${decision}Success`),
        tone: "success",
      });
    } catch {
      notify({ message: t("invitation.decisionError"), tone: "error" });
    } finally {
      setDecidingId(null);
    }
  }

  const workspaceState =
    status === "loading" ? (
      <p className="rounded-2xl border border-white/50 bg-white/70 p-5 text-sm text-slate-500 backdrop-blur dark:border-white/10 dark:bg-slate-950/70">
        {t("loading")}
      </p>
    ) : error ? (
      <section className="rounded-2xl border border-red-200 bg-red-50 p-5 text-red-800 dark:border-red-900 dark:bg-red-950/30 dark:text-red-200">
        <p className="text-sm font-medium">{t("loadError")}</p>
        <Button
          className="mt-3"
          onClick={() => void refresh()}
          size="small"
          variant="outline"
        >
          <RefreshCw className="size-4" />
          {t("retry")}
        </Button>
      </section>
    ) : (
      <>
        <section className="space-y-3" aria-labelledby="business-workspaces-title">
          <div className="flex items-center gap-2">
            <BriefcaseBusiness className="size-5 text-brand-navy dark:text-brand-orange" />
            <h2 className="text-lg font-semibold" id="business-workspaces-title">
              {surface === "standalone"
                ? t("currentBusinessTitle")
                : t("businessTitle")}
            </h2>
          </div>
          {businessWorkspaces.length ? (
            <div className="grid gap-3 xl:grid-cols-2">
              {businessWorkspaces.map((business) => (
                <WorkspaceCard business={business} key={business.id} personal={false} />
              ))}
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-white/70 p-6 text-sm text-slate-500 backdrop-blur dark:border-slate-700 dark:bg-slate-950/70">
              {t("businessEmpty")}
            </div>
          )}
        </section>

        <section className="space-y-3" aria-labelledby="personal-workspaces-title">
          <div className="flex items-center gap-2">
            <UserRound className="size-5 text-slate-500" />
            <h2 className="text-lg font-semibold" id="personal-workspaces-title">
              {t("personalTitle")}
            </h2>
          </div>
          {personalWorkspaces.length ? (
            <div className="grid gap-3 xl:grid-cols-2">
              {personalWorkspaces.map((business) => (
                <WorkspaceCard business={business} key={business.id} personal />
              ))}
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-white/70 p-6 text-sm text-slate-500 backdrop-blur dark:border-slate-700 dark:bg-slate-950/70">
              {t("personalEmpty")}
            </div>
          )}
        </section>
      </>
    );

  const invitationSection = (
    <section className="space-y-3" aria-labelledby="workspace-invitations-title">
      <div className="flex items-center gap-2">
        <Mail className="size-5 text-brand-orange" />
        <h2 className="text-lg font-semibold" id="workspace-invitations-title">
          {t("invitationsTitle")}
        </h2>
      </div>
      {invitations.length ? (
        <div className="divide-y divide-slate-200 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:divide-slate-800 dark:border-slate-800 dark:bg-slate-950">
          {invitations.map((invitation) => (
            <article
              className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center"
              key={invitation.id}
            >
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold">{t("invitation.title")}</p>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                  {t("invitation.details", {
                    businessId: invitation.business_id,
                    role: t(`roles.${invitation.role}`),
                  })}
                </p>
              </div>
              <div className="flex gap-2">
                <Button
                  disabled={decidingId === invitation.id}
                  onClick={() => void handleDecision(invitation.id, "accept")}
                  size="small"
                >
                  <Check className="size-4" />
                  {t("invitation.accept")}
                </Button>
                <Button
                  disabled={decidingId === invitation.id}
                  onClick={() => void handleDecision(invitation.id, "decline")}
                  size="small"
                  variant="outline"
                >
                  <X className="size-4" />
                  {t("invitation.decline")}
                </Button>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <p className="text-sm text-slate-500 dark:text-slate-400">
          {t("noInvitations")}
        </p>
      )}
    </section>
  );

  if (surface === "standalone") {
    return (
      <div className="grid gap-6 lg:grid-cols-[minmax(19rem,0.72fr)_minmax(0,1.28fr)] lg:items-start">
        <section className="rounded-[2rem] border border-white/60 bg-white/90 p-6 shadow-xl shadow-slate-950/5 backdrop-blur-xl dark:border-white/10 dark:bg-slate-950/88 lg:sticky lg:top-24 sm:p-7">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-brand-orange">
            {t("eyebrow")}
          </p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">
            {t("title")}
          </h1>
          <p className="mt-4 text-sm leading-6 text-slate-600 dark:text-slate-300">
            {t("description")}
          </p>
          <div className="mt-6">
            <DirectoryActions standalone />
          </div>
        </section>

        <div className="space-y-7">
          {workspaceState}
          {invitationSection}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <section className="flex flex-col gap-5 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-950 sm:flex-row sm:items-center sm:justify-between sm:p-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            {t("embeddedTitle")}
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600 dark:text-slate-300">
            {t("embeddedDescription")}
          </p>
        </div>
        <div className="shrink-0">
          <DirectoryActions standalone={false} />
        </div>
      </section>

      {workspaceState}
      {invitationSection}
    </div>
  );
}

export { WorkspaceDirectory };
