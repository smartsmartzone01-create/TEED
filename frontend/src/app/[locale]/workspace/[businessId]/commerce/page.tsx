import { ArrowRight, HandCoins } from "lucide-react";
import { getTranslations } from "next-intl/server";

import { CommerceOverviewWorkspace } from "@/components/commerce/overview/commerce-overview-workspace";
import { CommercePageShell } from "@/components/commerce/shared/commerce-page-shell";
import { Link } from "@/i18n/navigation";

export default async function Page({
  params,
}: {
  params: Promise<{ businessId: string }>;
}) {
  const { businessId } = await params;
  const t = await getTranslations("CommerceFinancing");
  return (
    <CommercePageShell>
      <div className="space-y-4">
        <CommerceOverviewWorkspace businessId={businessId} />
        <Link
          className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 bg-white p-3.5 transition hover:border-slate-300 hover:shadow-sm dark:border-slate-800 dark:bg-slate-950"
          href={`/workspace/${businessId}/commerce/financing` as never}
        >
          <div className="flex min-w-0 items-center gap-3">
            <span
              className="inline-flex size-9 shrink-0 items-center justify-center rounded-lg"
              style={{
                backgroundColor:
                  "color-mix(in srgb, var(--workspace-primary, var(--brand-navy)) 10%, white)",
                color: "var(--workspace-primary, var(--brand-navy))",
              }}
            >
              <HandCoins className="size-4" />
            </span>
            <div className="min-w-0">
              <strong className="block text-sm text-slate-950 dark:text-white">
                {t("title")}
              </strong>
              <span className="mt-0.5 block text-xs text-slate-500">
                {t("subtitle")}
              </span>
            </div>
          </div>
          <ArrowRight className="size-4 shrink-0 text-slate-400" />
        </Link>
      </div>
    </CommercePageShell>
  );
}
