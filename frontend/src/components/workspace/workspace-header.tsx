"use client";

import { Menu } from "lucide-react";
import { useTranslations } from "next-intl";

import { WorkspaceBusinessMenu } from "@/components/workspace/workspace-business-menu";

type WorkspaceHeaderProps = {
  onOpenNavigation: () => void;
};

function WorkspaceHeader({ onOpenNavigation }: WorkspaceHeaderProps) {
  const t = useTranslations("WorkspaceShell");

  return (
    <header className="sticky top-0 z-30 flex h-18 items-center justify-between gap-4 border-b border-slate-200 bg-white px-4 dark:border-slate-800 dark:bg-slate-950 sm:px-6">
      <div className="flex min-w-0 items-center gap-3">
        <button
          aria-label={t("openNavigation")}
          className="inline-flex size-10 shrink-0 items-center justify-center rounded-xl text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-900 lg:hidden"
          onClick={onOpenNavigation}
          type="button"
        >
          <Menu className="size-5" />
        </button>
        <div className="min-w-0">
          <p className="truncate text-xs font-medium text-slate-500 dark:text-slate-400">
            {t("workspaceLabel")}
          </p>
          <h1 className="truncate text-base font-semibold text-slate-950 dark:text-white">
            {t("navigation.overview")}
          </h1>
        </div>
      </div>

      <WorkspaceBusinessMenu placement="header" />
    </header>
  );
}

export { WorkspaceHeader };
