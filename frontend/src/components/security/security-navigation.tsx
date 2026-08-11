"use client";
import { Activity, KeyRound, MonitorSmartphone, ShieldCheck } from "lucide-react";
import { useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";
import { cn } from "@/lib/global/class-names";
const securityLinks=[{href:"/dashboard/security",key:"overview",icon:ShieldCheck},{href:"/dashboard/security/password",key:"password",icon:KeyRound},{href:"/dashboard/security/sessions",key:"sessions",icon:MonitorSmartphone},{href:"/dashboard/security/activity",key:"activity",icon:Activity}] as const;
function SecurityNavigation(){const path=usePathname();const t=useTranslations("SecurityNavigation");return <nav aria-label={t("label")} className="grid grid-cols-2 gap-2 lg:hidden">{securityLinks.map(({href,key,icon:Icon})=>{const active=href==="/dashboard/security"?path===href:path.startsWith(href);return <Link className={cn("flex min-h-11 items-center gap-2 rounded-xl border px-3 text-sm font-medium",active?"border-slate-900 bg-slate-900 text-white dark:border-white dark:bg-white dark:text-slate-950":"border-slate-200 bg-white text-slate-600 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-300")} href={href} key={key}><Icon className="size-4"/>{t(key)}</Link>})}</nav>}
export {SecurityNavigation,securityLinks};
