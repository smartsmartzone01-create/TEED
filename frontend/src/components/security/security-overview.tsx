"use client";

import {
  Activity,
  ArrowUpRight,
  MailCheck,
  MonitorSmartphone,
  Phone,
} from "lucide-react";
import { useTranslations } from "next-intl";

import { Tooltip } from "@/components/global/primitives/tooltip";
import { Link } from "@/i18n/navigation";
import { useSecurity } from "@/providers/security/security-provider";

import { SecurityPage } from "./security-page";

const stateStyles = {
  email: "border-blue-200 bg-blue-50/80 text-blue-950 dark:border-blue-900 dark:bg-blue-950/35 dark:text-blue-100",
  phone: "border-violet-200 bg-violet-50/80 text-violet-950 dark:border-violet-900 dark:bg-violet-950/35 dark:text-violet-100",
  recovery: "border-amber-200 bg-amber-50/80 text-amber-950 dark:border-amber-900 dark:bg-amber-950/35 dark:text-amber-100",
  sessions: "border-emerald-200 bg-emerald-50/80 text-emerald-950 dark:border-emerald-900 dark:bg-emerald-950/35 dark:text-emerald-100",
} as const;

function SecurityOverview() {
  const t = useTranslations("SecurityOverview");
  const { overview } = useSecurity();
  const cards = [
    {
      icon: MailCheck,
      key: "email",
      value: overview?.verified_contacts.email
        ? t("verified")
        : t("unverified"),
    },
    {
      icon: Phone,
      key: "phone",
      value: overview?.verified_contacts.phone
        ? t("verified")
        : t("unverified"),
    },
    {
      icon: MonitorSmartphone,
      key: "sessions",
      value: t("sessionCount", {
        count: overview?.active_session_count ?? 0,
      }),
    },
    {
      icon: Activity,
      key: "recovery",
      value: overview?.recovery.email_available
        ? t("emailReady")
        : t("notReady"),
    },
  ] as const;

  return (
    <SecurityPage title={t("title")} description={t("description")}>
      <section aria-labelledby="security-state-title">
        <h2 className="mb-3 text-sm font-semibold" id="security-state-title">
          {t("stateTitle")}
        </h2>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {cards.map(({ key, icon: Icon, value }) => (
            <div
              className={`rounded-2xl border p-4 ${stateStyles[key]}`}
              key={key}
            >
              <span className="inline-flex size-10 items-center justify-center rounded-xl bg-white/65 shadow-sm dark:bg-slate-950/40">
                <Icon className="size-5" />
              </span>
              <h3 className="mt-4 text-sm font-semibold">
                {t(`cards.${key}`)}
              </h3>
              <p className="mt-1 text-sm opacity-75">{value}</p>
            </div>
          ))}
        </div>
      </section>

      <section aria-labelledby="security-actions-title">
        <h2 className="mb-3 text-sm font-semibold" id="security-actions-title">
          {t("actionsTitle")}
        </h2>
        <div className="grid gap-3 lg:grid-cols-3">
          {(["password", "sessions", "activity"] as const).map((key) => (
            <Tooltip content={t(`links.${key}.tooltip`)} key={key} side="top">
              <Link
                className="group flex min-h-32 flex-col justify-between rounded-2xl border border-slate-200 bg-white p-5 transition hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md dark:border-slate-800 dark:bg-slate-950 dark:hover:border-slate-700"
                href={`/dashboard/security/${key}`}
              >
                <div>
                  <h3 className="font-semibold">{t(`links.${key}.title`)}</h3>
                  <p className="mt-1 text-sm text-slate-500">
                    {t(`links.${key}.description`)}
                  </p>
                </div>
                <ArrowUpRight className="mt-4 size-4 self-end text-slate-400 transition group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
              </Link>
            </Tooltip>
          ))}
        </div>
      </section>
    </SecurityPage>
  );
}

export { SecurityOverview };
