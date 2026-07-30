"use client";

import { AlertCircle, LoaderCircle, RotateCcw } from "lucide-react";
import { useTranslations } from "next-intl";
import type { ReactNode } from "react";

import { Button } from "@/components/global/primitives/button";
import { ProfileNavigation } from "@/components/profile/profile-navigation";
import { useProfile } from "@/providers/profile/profile-provider";

function ProfilePage({
  children,
  description,
  title,
}: {
  children: ReactNode;
  description: string;
  title: string;
}) {
  const t = useTranslations("ProfileCommon");
  const { refresh, status } = useProfile();

  return (
    <div className="space-y-5">
      <ProfileNavigation />
      <header>
        <p className="text-sm font-medium text-brand-orange">
          {t("eyebrow")}
        </p>
        <h2 className="mt-1 text-2xl font-semibold tracking-tight">
          {title}
        </h2>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500 dark:text-slate-400">
          {description}
        </p>
      </header>

      {status === "loading" ? (
        <div className="flex min-h-56 items-center justify-center rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950">
          <LoaderCircle className="size-6 animate-spin text-slate-500" />
          <span className="sr-only">{t("loading")}</span>
        </div>
      ) : status === "error" ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-5 text-red-950 dark:border-red-900 dark:bg-red-950 dark:text-red-50">
          <AlertCircle className="size-5" />
          <p className="mt-3 text-sm">{t("loadError")}</p>
          <Button
            className="mt-4"
            onClick={() => void refresh()}
            size="small"
            variant="outline"
          >
            <RotateCcw className="size-4" />
            {t("retry")}
          </Button>
        </div>
      ) : (
        children
      )}
    </div>
  );
}

export { ProfilePage };
