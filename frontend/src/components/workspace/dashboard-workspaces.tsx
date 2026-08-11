"use client";

import { ArrowRight, Building2, Check, Mail, Plus, RefreshCw, UserPlus, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";

import { Button } from "@/components/global/primitives/button";
import { Tooltip } from "@/components/global/primitives/tooltip";
import { Link } from "@/i18n/navigation";
import { useNotification } from "@/providers/global/notification-provider";
import { useWorkspace } from "@/providers/workspace/workspace-provider";

function DashboardWorkspaces() {
  const t = useTranslations("WorkspaceDashboard");
  const { notify } = useNotification();
  const { businesses, decideInvitation, error, invitations, refresh, status } = useWorkspace();
  const [decidingId, setDecidingId] = useState<string | null>(null);

  async function handleDecision(id: string, decision: "accept" | "decline") {
    setDecidingId(id);
    try {
      await decideInvitation(id, decision);
      notify({ message: t(`invitation.${decision}Success`), tone: "success" });
    } catch {
      notify({ message: t("invitation.decisionError"), tone: "error" });
    } finally {
      setDecidingId(null);
    }
  }

  return (
    <div className="space-y-6">
      <section className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-950 sm:flex-row sm:items-center sm:justify-between sm:p-6">
        <div>
          <p className="text-sm font-medium text-slate-500 dark:text-slate-400">{t("eyebrow")}</p>
          <h2 className="mt-1 text-2xl font-semibold tracking-tight">{t("title")}</h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600 dark:text-slate-300">{t("description")}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button asChild>
            <Link href="/dashboard/workspaces/create"><Plus className="size-4" />{t("create")}</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/dashboard/workspaces/access"><UserPlus className="size-4" />{t("request")}</Link>
          </Button>
        </div>
      </section>

      {status === "loading" ? (
        <p className="text-sm text-slate-500">{t("loading")}</p>
      ) : error ? (
        <section className="rounded-2xl border border-red-200 bg-red-50 p-5 text-red-800 dark:border-red-900 dark:bg-red-950/30 dark:text-red-200">
          <p className="text-sm font-medium">{t("loadError")}</p>
          <Button className="mt-3" onClick={() => void refresh()} size="small" variant="outline">
            <RefreshCw className="size-4" />{t("retry")}
          </Button>
        </section>
      ) : (
        <section aria-labelledby="business-list-title">
          <h2 className="mb-3 text-lg font-semibold" id="business-list-title">{t("businessesTitle")}</h2>
          {businesses.length ? (
            <div className="grid gap-3 lg:grid-cols-2">
              {businesses.map((business) => (
                <Tooltip content={t("openTooltip", { name: business.name })} key={business.id}>
                  <Link className="group flex items-center gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:border-slate-300 dark:border-slate-800 dark:bg-slate-950" href={`/workspace/${business.id}`}>
                    <span className="inline-flex size-11 shrink-0 items-center justify-center rounded-xl bg-brand-navy/10 text-brand-navy dark:bg-brand-orange/10 dark:text-brand-orange"><Building2 className="size-5" /></span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-semibold">{business.name}</span>
                      <span className="mt-1 block text-xs text-slate-500 dark:text-slate-400">{t("businessMeta", { country: business.country_code, role: t(`roles.${business.membership.role}`) })}</span>
                    </span>
                    <ArrowRight className="size-4 text-slate-400 transition group-hover:translate-x-0.5" />
                  </Link>
                </Tooltip>
              ))}
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-slate-300 p-6 text-center dark:border-slate-700">
              <Building2 className="mx-auto size-7 text-slate-400" />
              <p className="mt-3 text-sm font-medium">{t("empty")}</p>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{t("emptyHelp")}</p>
            </div>
          )}
        </section>
      )}

      <section aria-labelledby="invitation-list-title">
        <h2 className="mb-3 text-lg font-semibold" id="invitation-list-title">{t("invitationsTitle")}</h2>
        {invitations.length ? (
          <div className="divide-y divide-slate-200 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:divide-slate-800 dark:border-slate-800 dark:bg-slate-950">
            {invitations.map((invitation) => (
              <article className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center" key={invitation.id}>
                <Mail className="size-5 shrink-0 text-brand-orange" />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold">{t("invitation.title")}</p>
                  <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{t("invitation.details", { businessId: invitation.business_id, role: t(`roles.${invitation.role}`) })}</p>
                </div>
                <div className="flex gap-2">
                  <Button disabled={decidingId === invitation.id} onClick={() => void handleDecision(invitation.id, "accept")} size="small"><Check className="size-4" />{t("invitation.accept")}</Button>
                  <Button disabled={decidingId === invitation.id} onClick={() => void handleDecision(invitation.id, "decline")} size="small" variant="outline"><X className="size-4" />{t("invitation.decline")}</Button>
                </div>
              </article>
            ))}
          </div>
        ) : <p className="text-sm text-slate-500 dark:text-slate-400">{t("noInvitations")}</p>}
      </section>
    </div>
  );
}

export { DashboardWorkspaces };
