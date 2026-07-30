"use client";

import {
  ArrowRight,
  CheckCircle2,
  CircleAlert,
  Contact,
  Pencil,
  UserRound,
} from "lucide-react";
import { useTranslations } from "next-intl";

import { ProfilePage } from "@/components/profile/profile-page";
import { Tooltip } from "@/components/global/primitives/tooltip";
import { Link } from "@/i18n/navigation";
import { useProfile } from "@/providers/profile/profile-provider";

const quickLinks = [
  { href: "/dashboard/profile/personal", icon: UserRound, key: "personal" },
  { href: "/dashboard/profile/edit", icon: Pencil, key: "edit" },
  { href: "/dashboard/profile/contacts", icon: Contact, key: "contacts" },
] as const;

function ProfileOverview() {
  const t = useTranslations("ProfileOverview");
  const { overview } = useProfile();

  return (
    <ProfilePage description={t("description")} title={t("title")}>
      {overview ? (
        <div className="grid gap-4 xl:grid-cols-[1.2fr_1fr]">
          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-950">
            <div className="flex items-end justify-between gap-4">
              <div>
                <h3 className="font-semibold">{t("completion.title")}</h3>
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                  {t("completion.fields", {
                    complete: overview.completion.completed_fields,
                    total: overview.completion.total_required_fields,
                  })}
                </p>
              </div>
              <strong className="text-3xl">
                {overview.completion.percentage}%
              </strong>
            </div>
            <div className="mt-5 h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
              <div
                className="h-full rounded-full bg-gradient-to-r from-brand-navy to-brand-orange transition-[width]"
                style={{ width: `${overview.completion.percentage}%` }}
              />
            </div>

            {overview.prompts.length ? (
              <div className="mt-5 space-y-2">
                {overview.prompts.map((prompt) => (
                  <div
                    className="flex items-center gap-3 rounded-xl bg-slate-50 p-3 text-sm dark:bg-slate-900"
                    key={prompt.key}
                  >
                    <CircleAlert className="size-4 shrink-0 text-brand-orange" />
                    <span>{t(`prompts.${prompt.key}`)}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="mt-5 flex items-center gap-2 text-sm text-emerald-700 dark:text-emerald-300">
                <CheckCircle2 className="size-4" />
                {t("completion.complete")}
              </p>
            )}
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-950">
            <h3 className="font-semibold">{t("contacts.title")}</h3>
            <div className="mt-4 space-y-3">
              {(["email", "phone"] as const).map((contact) => {
                const verified = overview.verified_contacts[contact];
                return (
                  <div className="flex items-center justify-between rounded-xl border border-slate-200 p-3 dark:border-slate-800" key={contact}>
                    <span className="text-sm">{t(`contacts.${contact}`)}</span>
                    <span className={verified ? "text-xs font-medium text-emerald-700 dark:text-emerald-300" : "text-xs font-medium text-amber-700 dark:text-amber-300"}>
                      {t(verified ? "contacts.verified" : "contacts.unverified")}
                    </span>
                  </div>
                );
              })}
            </div>
          </section>

          <section className="grid gap-3 sm:grid-cols-3 xl:col-span-2">
            {quickLinks.map(({ href, icon: Icon, key }) => (
              <Tooltip content={t(`quickLinks.${key}.tooltip`)} key={key}>
                <Link className="group flex min-h-28 flex-col justify-between rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md dark:border-slate-800 dark:bg-slate-950" href={href}>
                  <Icon className="size-5 text-slate-500" />
                  <span className="flex items-end justify-between gap-2 text-sm font-semibold">
                    {t(`quickLinks.${key}.label`)}
                    <ArrowRight className="size-4 transition group-hover:translate-x-0.5" />
                  </span>
                </Link>
              </Tooltip>
            ))}
          </section>
        </div>
      ) : null}
    </ProfilePage>
  );
}

export { ProfileOverview };
