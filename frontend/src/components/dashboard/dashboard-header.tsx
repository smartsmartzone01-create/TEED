"use client";

import { Bell, Menu } from "lucide-react";
import { useTranslations } from "next-intl";

import { DashboardMobileMenu } from "@/components/dashboard/dashboard-mobile-menu";
import { LanguageSwitcher } from "@/components/global/controls/language-switcher";
import { ThemeSwitcher } from "@/components/global/controls/theme-switcher";
import { Tooltip } from "@/components/global/primitives/tooltip";
import { usePathname } from "@/i18n/navigation";

type DashboardHeaderProps = {
  onOpenNavigation: () => void;
};

function DashboardHeader({
  onOpenNavigation,
}: DashboardHeaderProps) {
  const pathname = usePathname();
  const t = useTranslations("DashboardShell");
  const section = pathname
    .replace(/^\/dashboard\/?/, "")
    .split("/")[0];
  const titleKey = section || "overview";

  return (
    <header className="sticky top-0 z-30 flex h-18 items-center justify-between gap-4 border-b border-slate-200 bg-white/90 px-4 backdrop-blur-xl dark:border-slate-800 dark:bg-slate-950/90 sm:px-6">
      <div className="flex min-w-0 items-center gap-3">
        <button
          aria-label={t("openNavigation")}
          className="inline-flex size-10 shrink-0 items-center justify-center rounded-xl text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-900 lg:hidden"
          onClick={onOpenNavigation}
          type="button"
        >
          <Menu className="size-5" />
        </button>

        <div className="hidden min-w-0 sm:block">
          <p className="truncate text-xs font-medium text-slate-500 dark:text-slate-400">
            {t("workspaceLabel")}
          </p>
          <h1 className="truncate text-base font-semibold text-slate-950 dark:text-white">
            {t(`navigation.${titleKey}`)}
          </h1>
        </div>
      </div>

      <div className="hidden shrink-0 items-center gap-1.5 sm:flex">
        <Tooltip content={t("notificationsSoon")}>
          <button
            aria-label={t("navigation.notifications")}
            className="relative inline-flex size-10 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 shadow-sm hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-300 dark:hover:bg-slate-900"
            type="button"
          >
            <Bell className="size-4.5" />
          </button>
        </Tooltip>
        <LanguageSwitcher showTooltip />
        <ThemeSwitcher showTooltip />
      </div>

      <div className="sm:hidden">
        <DashboardMobileMenu />
      </div>
    </header>
  );
}

export { DashboardHeader };
