"use client";
import { useTranslations } from "next-intl";
import { useSecurity } from "@/providers/security/security-provider";
import { SecurityPage } from "./security-page";
function SecurityActivity(){const t=useTranslations("SecurityActivity");const {events}=useSecurity();return <SecurityPage title={t("title")} description={t("description")}><div className="space-y-3">{events.length?events.map(e=><article className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-950" key={e.id}><div className="flex justify-between gap-3"><h2 className="font-semibold">{t.has(`events.${e.event_type}`)?t(`events.${e.event_type}`):t("events.other")}</h2><span className="text-xs uppercase text-slate-500">{t(`outcomes.${e.outcome}`)}</span></div><p className="mt-2 text-sm text-slate-500">{new Date(e.occurred_at).toLocaleString()}{e.ip_address?` · ${e.ip_address}`:""}</p></article>):<p className="rounded-2xl border p-5">{t("empty")}</p>}</div></SecurityPage>}
export {SecurityActivity};
