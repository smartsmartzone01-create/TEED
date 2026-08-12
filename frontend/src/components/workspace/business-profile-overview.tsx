"use client";

import { ArrowRight, CircleCheck, Palette, Store, Warehouse } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";

import { BusinessPage } from "@/components/workspace/business-page";
import { Tooltip } from "@/components/global/primitives/tooltip";
import { Link } from "@/i18n/navigation";
import { useWorkspace } from "@/providers/workspace/workspace-provider";
import type { BusinessProfileData } from "@/types/workspace/workspace";

const links = [
  { icon: Store, key: "information", path: "information" },
  { icon: Palette, key: "brand", path: "brand" },
  { icon: Warehouse, key: "operations", path: "operations" },
] as const;

function BusinessProfileOverview({ businessId }: { businessId: string }) {
  const t = useTranslations("BusinessProfile");
  const { loadProfile } = useWorkspace();
  const [data, setData] = useState<BusinessProfileData | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    void loadProfile(businessId, controller.signal).then(setData);
    return () => controller.abort();
  }, [businessId, loadProfile]);

  return (
    <BusinessPage description={t("overview.description")} eyebrow={t("eyebrow")} title={t("overview.title")}>
      {data ? (
        <>
          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-950">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-semibold">{t("overview.completion")}</p>
                <p className="mt-1 text-3xl font-semibold" style={{ color: "var(--workspace-primary, var(--brand-navy))" }}>{data.completion.percentage}%</p>
              </div>
              <CircleCheck className="size-8" style={{ color: "var(--workspace-secondary, var(--brand-orange))" }} />
            </div>
            <div className="mt-4 h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
              <div className="h-full rounded-full transition-[width]" style={{ background: "linear-gradient(90deg,var(--workspace-primary),var(--workspace-secondary))", width: `${data.completion.percentage}%` }} />
            </div>
            <p className="mt-3 text-xs text-slate-500">{data.completion.missing_fields.length ? t("overview.missing", { fields: data.completion.missing_fields.join(", ") }) : t("overview.complete")}</p>
          </section>
          <section className="grid gap-3 lg:grid-cols-3">
            {links.map(({ icon: Icon, key, path }) => (
              <Tooltip content={t(`links.${key}.tooltip`)} key={key}>
                <Link className="group rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 dark:border-slate-800 dark:bg-slate-950" href={`/workspace/${businessId}/profile/${path}`}>
                  <Icon className="size-5" style={{ color: "var(--workspace-primary)" }} />
                  <h3 className="mt-4 text-sm font-semibold">{t(`links.${key}.title`)}</h3>
                  <p className="mt-1 text-xs leading-5 text-slate-500">{t(`links.${key}.description`)}</p>
                  <ArrowRight className="mt-4 size-4 text-slate-400 transition group-hover:translate-x-1" />
                </Link>
              </Tooltip>
            ))}
          </section>
        </>
      ) : <p className="text-sm text-slate-500">{t("loading")}</p>}
    </BusinessPage>
  );
}

export { BusinessProfileOverview };
