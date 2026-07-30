"use client";

import { CheckCircle2, Mail, Phone, ShieldAlert } from "lucide-react";
import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";

import { ProfilePage } from "@/components/profile/profile-page";
import { Button } from "@/components/global/primitives/button";
import { Link } from "@/i18n/navigation";
import { useIdentitySession } from "@/providers/identity/identity-session-provider";
import { ApiClientError } from "@/services/global/api-client";
import { getContactInformation } from "@/services/profile/profile";
import type { ContactInformation as ContactInformationType } from "@/types/profile/profile";

function ContactInformation() {
  const t = useTranslations("ContactInformation");
  const { accessToken, refreshAccessToken } = useIdentitySession();
  const [contacts, setContacts] = useState<ContactInformationType | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let active = true;
    if (!accessToken) return;

    getContactInformation(accessToken)
      .catch(async (error) => {
        if (
          error instanceof ApiClientError &&
          error.details.kind === "unauthenticated"
        ) {
          return getContactInformation(await refreshAccessToken());
        }
        throw error;
      })
      .then((response) => {
        if (active) setContacts(response.data ?? null);
      })
      .catch(() => {
        if (active) setFailed(true);
      });

    return () => {
      active = false;
    };
  }, [accessToken, refreshAccessToken]);

  return (
    <ProfilePage description={t("description")} title={t("title")}>
      {failed ? (
        <p className="rounded-2xl border border-red-200 bg-red-50 p-5 text-sm text-red-900 dark:border-red-900 dark:bg-red-950 dark:text-red-100">
          {t("loadError")}
        </p>
      ) : contacts ? (
        <div className="grid gap-4 lg:grid-cols-2">
          {(["email", "phone"] as const).map((key) => {
            const contact = contacts[key];
            const Icon = key === "email" ? Mail : Phone;
            return (
              <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-950" key={key}>
                <div className="flex items-start gap-3">
                  <span className="inline-flex size-10 items-center justify-center rounded-xl bg-slate-100 dark:bg-slate-900">
                    <Icon className="size-4.5" />
                  </span>
                  <div className="min-w-0">
                    <h3 className="font-semibold">{t(`${key}.title`)}</h3>
                    <p className="mt-1 break-all text-sm text-slate-600 dark:text-slate-300">
                      {contact.value || t("notProvided")}
                    </p>
                  </div>
                </div>
                <p className={`mt-4 flex items-center gap-2 text-sm ${contact.verified ? "text-emerald-700 dark:text-emerald-300" : "text-amber-700 dark:text-amber-300"}`}>
                  {contact.verified ? <CheckCircle2 className="size-4" /> : <ShieldAlert className="size-4" />}
                  {t(contact.verified ? "verified" : "unverified")}
                </p>
                <p className="mt-4 text-sm leading-6 text-slate-500 dark:text-slate-400">
                  {t(`${key}.purpose`)}
                </p>
                <p className="mt-3 text-xs text-slate-500">
                  {t(contact.recovery_available ? "recoveryAvailable" : "recoveryUnavailable")}
                </p>
              </section>
            );
          })}
          <section className="rounded-2xl border border-blue-200 bg-blue-50 p-5 dark:border-blue-900 dark:bg-blue-950 lg:col-span-2">
            <h3 className="font-semibold">{t("identityManaged.title")}</h3>
            <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">
              {t("identityManaged.description")}
            </p>
            <Button asChild className="mt-4" size="small">
              <Link href="/dashboard/security">{t("identityManaged.action")}</Link>
            </Button>
          </section>
        </div>
      ) : (
        <p className="text-sm text-slate-500">{t("loading")}</p>
      )}
    </ProfilePage>
  );
}

export { ContactInformation };
