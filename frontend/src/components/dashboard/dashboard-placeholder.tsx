import { ArrowLeft, Construction } from "lucide-react";
import { getTranslations } from "next-intl/server";

import { Link } from "@/i18n/navigation";

type DashboardPlaceholderProps = {
  section:
    | "ai"
    | "billing"
    | "help"
    | "notifications"
    | "preferences"
    | "profile"
    | "security"
    | "workspaces";
};

async function DashboardPlaceholder({
  section,
}: DashboardPlaceholderProps) {
  const t = await getTranslations("DashboardPlaceholder");
  const shellT = await getTranslations("DashboardShell");

  return (
    <section className="flex min-h-[calc(100svh-10rem)] items-center justify-center">
      <div className="w-full max-w-xl rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-sm dark:border-slate-800 dark:bg-slate-950 sm:p-10">
        <span className="mx-auto inline-flex size-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-700 dark:bg-slate-900 dark:text-slate-200">
          <Construction className="size-5" />
        </span>
        <p className="mt-5 text-sm font-medium text-brand-orange-accessible dark:text-brand-orange">
          {t("eyebrow")}
        </p>
        <h2 className="mt-2 text-2xl font-semibold tracking-tight">
          {shellT(`navigation.${section}`)}
        </h2>
        <p className="mt-3 leading-7 text-slate-600 dark:text-slate-400">
          {t("description")}
        </p>
        <Link
          className="mt-7 inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 text-sm font-medium text-white hover:bg-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900/30 dark:bg-white dark:text-slate-950 dark:hover:bg-slate-200"
          href="/dashboard"
        >
          <ArrowLeft className="size-4" />
          {t("back")}
        </Link>
      </div>
    </section>
  );
}

export { DashboardPlaceholder };
