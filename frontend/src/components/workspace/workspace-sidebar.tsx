"use client";

import {
  Building2,
  ChevronLeft,
  ChevronRight,
  Inbox,
  LayoutDashboard,
  LockKeyhole,
  MailPlus,
  UserRoundCog,
  UsersRound,
  X,
} from "lucide-react";
import { useTranslations } from "next-intl";

import { BrandMark } from "@/components/global/brand/brand-mark";
import { Tooltip } from "@/components/global/primitives/tooltip";
import { WorkspaceAccountMenu } from "@/components/workspace/workspace-account-menu";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/global/class-names";

type WorkspaceSidebarProps = {
  collapsed: boolean;
  mobileOpen: boolean;
  onCloseMobile: () => void;
  onToggleCollapsed: () => void;
};

const items = [
  { icon: LayoutDashboard, key: "overview", ready: true },
  { icon: Building2, key: "business", ready: false },
  { icon: UsersRound, key: "members", ready: false },
  { icon: MailPlus, key: "invitations", ready: false },
  { icon: Inbox, key: "accessRequests", ready: false },
  { icon: UserRoundCog, key: "roles", ready: false },
  { icon: LockKeyhole, key: "control", ready: false },
] as const;

function WorkspaceSidebar({
  collapsed,
  mobileOpen,
  onCloseMobile,
  onToggleCollapsed,
}: WorkspaceSidebarProps) {
  const t = useTranslations("WorkspaceShell");

  return (
    <>
      <button
        aria-label={t("closeNavigation")}
        className={cn(
          "fixed inset-0 z-40 bg-slate-950/25 backdrop-blur-sm lg:hidden",
          mobileOpen ? "block" : "hidden",
        )}
        onClick={onCloseMobile}
        type="button"
      />

      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex w-[min(18rem,88vw)] flex-col border-r border-slate-200 bg-white text-slate-950",
          "transition-[width,transform] duration-300 ease-out dark:border-slate-800 dark:bg-slate-950 dark:text-white",
          collapsed ? "lg:w-[5.25rem]" : "lg:w-72",
          mobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0",
        )}
      >
        <div className="flex h-18 shrink-0 items-center justify-between border-b border-slate-200 px-4 dark:border-slate-800">
          <BrandMark
            className={cn("text-2xl", collapsed && "lg:sr-only")}
            href="/workspace"
            tone="adaptive"
          />
          <button
            aria-label={t(collapsed ? "expandSidebar" : "collapseSidebar")}
            className="hidden size-9 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-950 dark:hover:bg-slate-900 dark:hover:text-white lg:inline-flex"
            onClick={onToggleCollapsed}
            type="button"
          >
            {collapsed ? <ChevronRight className="size-4" /> : <ChevronLeft className="size-4" />}
          </button>
          <button
            aria-label={t("closeNavigation")}
            className="inline-flex size-9 items-center justify-center rounded-lg hover:bg-slate-100 dark:hover:bg-slate-900 lg:hidden"
            onClick={onCloseMobile}
            type="button"
          >
            <X className="size-4" />
          </button>
        </div>

        <nav aria-label={t("primaryNavigation")} className="flex-1 space-y-1 overflow-y-auto px-3 py-5">
          {items.map((item) => {
            const Icon = item.icon;
            const content = item.ready ? (
              <Link
                aria-current="page"
                className={cn(
                  "flex min-h-11 items-center gap-3 rounded-xl bg-slate-100 px-3 text-sm font-semibold text-slate-950",
                  "dark:bg-slate-900 dark:text-white",
                  collapsed && "lg:justify-center lg:px-0",
                )}
                href="/workspace"
                onClick={onCloseMobile}
              >
                <Icon className="size-4.5 shrink-0" />
                <span className={cn(collapsed && "lg:sr-only")}>{t(`navigation.${item.key}`)}</span>
              </Link>
            ) : (
              <button
                className={cn(
                  "flex min-h-11 w-full cursor-not-allowed items-center gap-3 rounded-xl px-3 text-sm font-medium text-slate-400",
                  collapsed && "lg:justify-center lg:px-0",
                )}
                disabled
                type="button"
              >
                <Icon className="size-4.5 shrink-0" />
                <span className={cn(collapsed && "lg:sr-only")}>{t(`navigation.${item.key}`)}</span>
              </button>
            );

            return (
              <Tooltip content={item.ready ? t(`navigation.${item.key}`) : t("availableAfterIntegration")} key={item.key}>
                {content}
              </Tooltip>
            );
          })}
        </nav>

        <div className="shrink-0 border-t border-slate-200 p-3 dark:border-slate-800">
          <WorkspaceAccountMenu compact={collapsed} />
        </div>
      </aside>
    </>
  );
}

export { WorkspaceSidebar };
