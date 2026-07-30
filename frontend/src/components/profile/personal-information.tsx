"use client";

import { CheckCircle2, ShieldAlert } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";

import { ProfilePage } from "@/components/profile/profile-page";
import { useProfile } from "@/providers/profile/profile-provider";

function PersonalInformation() {
  const locale = useLocale();
  const t = useTranslations("PersonalInformation");
  const { personal } = useProfile();

  if (!personal) {
    return (
      <ProfilePage description={t("description")} title={t("title")}>
        {null}
      </ProfilePage>
    );
  }

  const rows = [
    ["firstName", personal.first_name],
    ["lastName", personal.last_name],
    ["username", personal.username],
    ["country", t(`countries.${personal.country_code}`)],
    ["region", personal.region],
    ["email", personal.email],
    ["phone", personal.phone_number],
    [
      "created",
      new Intl.DateTimeFormat(locale, { dateStyle: "long" }).format(
        new Date(personal.created_at),
      ),
    ],
  ] as const;

  const fullName =
    `${personal.first_name} ${personal.last_name}`.trim() ||
    personal.username ||
    "";
  const initials = fullName.slice(0, 2).toUpperCase();

  return (
    <ProfilePage description={t("description")} title={t("title")}>
      <div className="grid gap-4 xl:grid-cols-[18rem_1fr]">
        <section className="rounded-2xl border border-slate-200 bg-white p-5 text-center shadow-sm dark:border-slate-800 dark:bg-slate-950">
          {personal.profile_image_url ? (
            <span
              aria-label={t("imageAlt")}
              className="mx-auto block size-32 rounded-full bg-cover bg-center shadow-md"
              role="img"
              style={{ backgroundImage: `url("${personal.profile_image_url}")` }}
            />
          ) : (
            <span className="mx-auto inline-flex size-32 items-center justify-center rounded-full bg-gradient-to-br from-brand-navy to-brand-orange text-3xl font-semibold text-white">
              {initials}
            </span>
          )}
          <p className="mt-4 font-semibold">{fullName}</p>
          <p className="mt-1 text-sm text-slate-500">@{personal.username}</p>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-950">
          <dl className="grid gap-x-8 sm:grid-cols-2">
            {rows.map(([key, value]) => (
              <div className="border-b border-slate-100 py-4 dark:border-slate-800" key={key}>
                <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">
                  {t(`fields.${key}`)}
                </dt>
                <dd className="mt-1 break-words text-sm font-medium">
                  {value || t("notProvided")}
                </dd>
                {(key === "email" || key === "phone") && (
                  <span className={`mt-2 inline-flex items-center gap-1 text-xs ${personal[key === "email" ? "is_email_verified" : "is_phone_verified"] ? "text-emerald-700 dark:text-emerald-300" : "text-amber-700 dark:text-amber-300"}`}>
                    {personal[key === "email" ? "is_email_verified" : "is_phone_verified"] ? <CheckCircle2 className="size-3.5" /> : <ShieldAlert className="size-3.5" />}
                    {t(personal[key === "email" ? "is_email_verified" : "is_phone_verified"] ? "verified" : "unverified")}
                  </span>
                )}
              </div>
            ))}
          </dl>
        </section>
      </div>
    </ProfilePage>
  );
}

export { PersonalInformation };
