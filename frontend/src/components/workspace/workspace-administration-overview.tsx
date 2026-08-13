"use client";

import { ArrowRight, KeyRound, ScrollText, Settings2, ShieldCheck } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";

import { Tooltip } from "@/components/global/primitives/tooltip";
import { BusinessPage } from "@/components/workspace/business-page";
import { Link } from "@/i18n/navigation";
import { useWorkspace } from "@/providers/workspace/workspace-provider";
import { isRequestCancelled } from "@/services/global/api-client";
import type { BusinessSecurityData, BusinessSettingsData } from "@/types/workspace/workspace";

function WorkspaceAdministrationOverview({ businessId }: { businessId: string }) {
  const t = useTranslations("WorkspaceAdministration");
  const { loadSecurity, loadSettings } = useWorkspace();
  const [data, setData] = useState<{ security: BusinessSecurityData; settings: BusinessSettingsData } | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    void Promise.all([loadSecurity(businessId, controller.signal), loadSettings(businessId, controller.signal)])
      .then(([security, settings]) => setData({ security, settings }))
      .catch((error) => { if (!isRequestCancelled(error)) setData(null); });
    return () => controller.abort();
  }, [businessId, loadSecurity, loadSettings]);

  if (!data) return <p className="text-sm text-slate-500">{t("loading")}</p>;

  const destinations = [
    { href: `/workspace/${businessId}/settings`, icon: Settings2, key: "preferences" },
    { href: `/workspace/${businessId}/security`, icon: ShieldCheck, key: "security" },
    { href: `/workspace/${businessId}/security/audit`, icon: ScrollText, key: "audit" },
    { href: `/workspace/${businessId}/security/control`, icon: KeyRound, key: "lifecycle" },
  ] as const;

  return <BusinessPage description={t("description")} eyebrow={t("eyebrow")} title={t("title")}>
    <section className="grid gap-3 sm:grid-cols-3">
      <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-950"><ShieldCheck className="size-5 text-emerald-600" /><p className="mt-3 text-sm font-semibold">{t("state.role")}</p><p className="mt-1 text-sm text-slate-500">{data.security.membership.role}</p></article>
      <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-950"><Settings2 className="size-5" /><p className="mt-3 text-sm font-semibold">{t("state.language")}</p><p className="mt-1 text-sm text-slate-500">{data.settings.settings.language_code.toUpperCase()}</p></article>
      <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-950"><KeyRound className="size-5" /><p className="mt-3 text-sm font-semibold">{t("state.pending")}</p><p className="mt-1 text-2xl font-semibold">{data.security.pending_controls.length}</p></article>
    </section>
    <section className="grid gap-3 sm:grid-cols-2">{destinations.map(({ href, icon: Icon, key }) => <Tooltip content={t(`links.${key}.tooltip`)} key={key}><Link className="group rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-950" href={href}><Icon className="size-5" /><h3 className="mt-4 font-semibold">{t(`links.${key}.title`)}</h3><p className="mt-1 text-sm text-slate-500">{t(`links.${key}.description`)}</p><ArrowRight className="mt-4 size-4 transition group-hover:translate-x-1" /></Link></Tooltip>)}</section>
  </BusinessPage>;
}

export { WorkspaceAdministrationOverview };
