"use client";

import { ChevronRight, Menu } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";

import { LanguageSwitcher } from "@/components/global/controls/language-switcher";
import { ThemeSwitcher } from "@/components/global/controls/theme-switcher";
import { NotificationBell } from "@/components/notifications/notification-bell";
import { WorkspaceBusinessMenu } from "@/components/workspace/workspace-business-menu";
import { WorkspaceMobileMenu } from "@/components/workspace/workspace-mobile-menu";
import { usePathname } from "@/i18n/navigation";

type WorkspaceHeaderProps = {
  businessId?: string | null;
  onOpenNavigation: () => void;
};

type BreadcrumbItem = {
  label: string;
};

function WorkspaceHeader({ businessId, onOpenNavigation }: WorkspaceHeaderProps) {
  const t = useTranslations("WorkspaceShell");
  const locale = useLocale();
  const pathname = usePathname();
  const workspaceBase = businessId ? `/workspace/${businessId}` : "";
  const relativePath =
    workspaceBase && pathname.startsWith(workspaceBase)
      ? pathname.slice(workspaceBase.length) || "/"
      : pathname;

  const homeLabel = locale === "sw" ? "Mwanzo" : "Home";
  const toolsLabel = locale === "sw" ? "Zana zote" : "All Tools";
  const operationsLabel = locale === "sw" ? "Uendeshaji" : "Operations";
  const administrationLabel = locale === "sw" ? "Usimamizi" : "Administration";
  const commerceLabel = locale === "sw" ? "Biashara" : "Commerce";

  const routes: Record<string, BreadcrumbItem[]> = {
    "/": [{ label: homeLabel }],
    "/directory": [{ label: toolsLabel }],
    "/notifications": [{ label: t("notifications") }],
    "/commerce": [
      { label: operationsLabel },
      { label: commerceLabel },
      { label: t("subnavigation.commerceOverview") },
    ],
    "/commerce/products": [
      { label: operationsLabel },
      { label: commerceLabel },
      { label: t("subnavigation.products") },
    ],
    "/commerce/inventory": [
      { label: operationsLabel },
      { label: commerceLabel },
      { label: t("subnavigation.inventory") },
    ],
    "/commerce/sales": [
      { label: operationsLabel },
      { label: commerceLabel },
      { label: t("subnavigation.sales") },
    ],
    "/commerce/returns": [
      { label: operationsLabel },
      { label: commerceLabel },
      { label: t("subnavigation.returns") },
    ],
    "/commerce/expenses": [
      { label: operationsLabel },
      { label: commerceLabel },
      { label: t("subnavigation.expenses") },
    ],
    "/commerce/budgets": [
      { label: operationsLabel },
      { label: commerceLabel },
      { label: t("subnavigation.budgets") },
    ],
    "/members": [
      { label: administrationLabel },
      { label: t("navigation.membership") },
      { label: t("subnavigation.members") },
    ],
    "/invitations": [
      { label: administrationLabel },
      { label: t("navigation.membership") },
      { label: t("subnavigation.invitations") },
    ],
    "/access-requests": [
      { label: administrationLabel },
      { label: t("navigation.membership") },
      { label: t("subnavigation.accessRequests") },
    ],
    "/roles": [
      { label: administrationLabel },
      { label: t("navigation.membership") },
      { label: t("subnavigation.roles") },
    ],
    "/profile": [
      { label: administrationLabel },
      { label: t("navigation.profile") },
      { label: t("subnavigation.profileOverview") },
    ],
    "/profile/information": [
      { label: administrationLabel },
      { label: t("navigation.profile") },
      { label: t("subnavigation.information") },
    ],
    "/profile/brand": [
      { label: administrationLabel },
      { label: t("navigation.profile") },
      { label: t("subnavigation.brand") },
    ],
    "/profile/operations": [
      { label: administrationLabel },
      { label: t("navigation.profile") },
      { label: t("subnavigation.operations") },
    ],
    "/administration": [
      { label: administrationLabel },
      { label: t("navigation.settingsSecurity") },
      { label: t("subnavigation.settingsOverview") },
    ],
    "/settings": [
      { label: administrationLabel },
      { label: t("navigation.settingsSecurity") },
      { label: t("subnavigation.workspacePreferences") },
    ],
    "/security/audit": [
      { label: administrationLabel },
      { label: t("navigation.settingsSecurity") },
      { label: t("subnavigation.audit") },
    ],
    "/security/control": [
      { label: administrationLabel },
      { label: t("navigation.settingsSecurity") },
      { label: t("subnavigation.businessLifecycle") },
    ],
  };
  const breadcrumbs = routes[relativePath] ?? [{ label: homeLabel }];

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center justify-between gap-3 border-b border-slate-200 bg-white px-3 dark:border-slate-800 dark:bg-slate-950 sm:px-4">
      <div className="flex min-w-0 items-center gap-2">
        <button
          aria-label={t("openNavigation")}
          className="inline-flex size-8 shrink-0 items-center justify-center rounded-lg text-slate-500 hover:bg-interactive-highlight hover:text-slate-900 dark:text-slate-400 dark:hover:text-white lg:hidden"
          onClick={onOpenNavigation}
          type="button"
        >
          <Menu className="size-4" />
        </button>

        <nav
          aria-label={t("primaryNavigation")}
          className="flex min-w-0 items-center gap-1.5 overflow-hidden text-xs"
        >
          {breadcrumbs.map((item, index) => {
            const current = index === breadcrumbs.length - 1;
            return (
              <span className="contents" key={`${item.label}-${index}`}>
                {index > 0 ? (
                  <ChevronRight
                    aria-hidden="true"
                    className="size-3 shrink-0 text-slate-300 dark:text-slate-700"
                  />
                ) : null}
                <span
                  aria-current={current ? "page" : undefined}
                  className={
                    current
                      ? "truncate font-semibold text-slate-900 dark:text-slate-100"
                      : "truncate font-medium text-slate-500 dark:text-slate-400"
                  }
                >
                  {item.label}
                </span>
              </span>
            );
          })}
        </nav>
      </div>

      <div className="flex shrink-0 items-center gap-1 [&_a]:size-8 [&_button]:size-8 [&_svg]:size-3.5">
        <div className="hidden items-center gap-1 sm:flex">
          <NotificationBell
            businessId={businessId ?? undefined}
            href={
              businessId
                ? `/workspace/${businessId}/notifications`
                : "/dashboard/notifications"
            }
          />
          <LanguageSwitcher showTooltip />
          <ThemeSwitcher showTooltip />
        </div>
        <div className="hidden sm:block">
          <WorkspaceBusinessMenu showLabel={false} />
        </div>
        <div className="sm:hidden">
          <WorkspaceMobileMenu />
        </div>
      </div>
    </header>
  );
}

export { WorkspaceHeader };
