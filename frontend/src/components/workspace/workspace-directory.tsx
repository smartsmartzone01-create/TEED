"use client";

import {
  ArrowRight,
  BriefcaseBusiness,
  Check,
  LayoutDashboard,
  Mail,
  Plus,
  RefreshCw,
  UserRound,
  UserPlus,
  X,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { useMemo, useState } from "react";

import { BusinessIcon } from "@/components/workspace/business-icon";
import { Button } from "@/components/global/primitives/button";
import { Link } from "@/i18n/navigation";
import { useNotification } from "@/providers/global/notification-provider";
import { useWorkspace } from "@/providers/workspace/workspace-provider";
import type { WorkspaceBusinessListItem } from "@/types/workspace/workspace";
import { workspaceClassForType } from "@/utils/workspace/workspace-class";

type WorkspaceDirectoryProps = {
  surface?: "dashboard" | "standalone";
};

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
      className="group flex items-center gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-navy/30 dark:border-slate-800 dark:bg-slate-950 dark:hover:border-slate-700"
      href={href}
    >
      <BusinessIcon
        className="size-11 shrink-0"
        logoUrl={business.logo_url}
        name={business.name}
        primaryColor={business.primary_brand_color}
        secondaryColor={business.secondary_brand_color}
      />
      <span className="min-w-0 flex-1">
        <span className="flex flex-wrap items-center gap-2">
          <strong className="truncate text-sm">{business.name}</strong>
          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-slate-600 dark:bg-slate-900 dark:text-slate-300">
            {personal
              ? t("personalClass")
              : business.workspace_type === "service"
                ? t("legacyService")
                : t("businessClass")}
          </span>
          {personal ? (
            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-500 dark:bg-slate-900 dark:text-slate-400">
              {t("ownerOnly")}
            </span>
          ) : null}
        </span>
        <span className="mt-1 block truncate text-xs font-medium text-brand-navy dark:text-brand-orange">
          @{business.public_handle}
        </span>
        <span className="mt-1 block text-xs text-slate-500 dark:text-slate-400">
          {t("meta", {
            country: business.country_code,
            role: t(`roles.${business.membership.role}`),
          })}
        </span>
      </span>
      <ArrowRight className="size-4 shrink-0 text-slate-400 transition group-hover:translate-x-0.5" />
    </Link>
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

  return (
    <div className={surface === "standalone" ? "mx-auto w-full max-w-6xl space-y-6 p-4 sm:p-6 lg:p-8" : "space-y-6"}>
      <section className="flex flex-col gap-4 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-950 sm:flex-row sm:items-center sm:justify-between sm:p-6">
        <div>
          {surface === "standalone" ? (
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-brand-orange">
              {t("eyebrow")}
            </p>
          ) : null}
          <h1 className="mt-1 text-2xl font-semibold tracking-tight">
            {surface === "standalone" ? t("title") : t("embeddedTitle")}
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600 dark:text-slate-300">
            {surface === "standalone" ? t("description") : t("embeddedDescription")}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button asChild>
            <Link href="/dashboard/workspaces/create">
              <Plus className="size-4" />
              {t("create")}
            </Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/dashboard/workspaces/access">
              <UserPlus className="size-4" />
              {t("request")}
            </Link>
          </Button>
          {surface === "standalone" ? (
            <Button asChild variant="ghost">
              <Link href="/dashboard">
                <LayoutDashboard className="size-4" />
                {t("personalDashboard")}
              </Link>
            </Button>
          ) : null}
        </div>
      </section>

      {status === "loading" ? (
        <p className="text-sm text-slate-500">{t("loading")}</p>
      ) : error ? (
        <section className="rounded-2xl border border-red-200 bg-red-50 p-5 text-red-800 dark:border-red-900 dark:bg-red-950/30 dark:text-red-200">
          <p className="text-sm font-medium">{t("loadError")}</p>
          <Button className="mt-3" onClick={() => void refresh()} size="small" variant="outline">
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
                {t("businessTitle")}
              </h2>
            </div>
            {businessWorkspaces.length ? (
              <div className="grid gap-3 lg:grid-cols-2">
                {businessWorkspaces.map((business) => (
                  <WorkspaceCard business={business} key={business.id} personal={false} />
                ))}
              </div>
            ) : (
              <div className="rounded-2xl border border-dashed border-slate-300 p-6 text-sm text-slate-500 dark:border-slate-700">
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
              <div className="grid gap-3 lg:grid-cols-2">
                {personalWorkspaces.map((business) => (
                  <WorkspaceCard business={business} key={business.id} personal />
                ))}
              </div>
            ) : (
              <div className="rounded-2xl border border-dashed border-slate-300 p-6 text-sm text-slate-500 dark:border-slate-700">
                {t("personalEmpty")}
              </div>
            )}
          </section>
        </>
      )}

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
              <article className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center" key={invitation.id}>
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
    </div>
  );
}

export { WorkspaceDirectory };
