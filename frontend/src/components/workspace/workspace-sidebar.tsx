"use client";

import {
  Building2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Inbox,
  LayoutDashboard,
  LockKeyhole,
  Palette,
  Settings2,
  Store,
  MailPlus,
  UserRoundCog,
  UsersRound,
  X,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { usePathname } from "next/navigation";
import { useMemo } from "react";

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
  { icon: UsersRound, key: "members", ready: false },
  { icon: MailPlus, key: "invitations", ready: false },
  { icon: Inbox, key: "accessRequests", ready: false },
  { icon: UserRoundCog, key: "roles", ready: false },
] as const;

function WorkspaceSidebar({
  collapsed,
  mobileOpen,
  onCloseMobile,
  onToggleCollapsed,
}: WorkspaceSidebarProps) {
  const t = useTranslations("WorkspaceShell");
  const pathname = usePathname();
  const businessId = useMemo(() => pathname.match(/\/workspace\/([^/]+)/)?.[1] ?? null, [pathname]);
  const inProfile = pathname.includes("/profile");
  const inSecurity = pathname.includes("/security");

  const readyItems = businessId ? [
    { icon: LayoutDashboard, href: `/workspace/${businessId}`, key: "overview" },
    { icon: Building2, href: `/workspace/${businessId}/profile`, key: "business" },
    { icon: Settings2, href: `/workspace/${businessId}/settings`, key: "settings" },
    { icon: LockKeyhole, href: `/workspace/${businessId}/security`, key: "control" },
  ] as const : [];

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
          {readyItems.map((item) => {
            const Icon = item.icon;
            const active = item.key === "business" ? inProfile : item.key === "control" ? inSecurity : pathname === item.href;
            return <div key={item.key}>
              <Tooltip content={t(`navigation.${item.key}`)}>
                <Link aria-current={active ? "page" : undefined} className={cn("flex min-h-11 items-center gap-3 rounded-xl px-3 text-sm font-semibold", active ? "bg-slate-100 text-slate-950 dark:bg-slate-900 dark:text-white" : "text-slate-600 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-900", collapsed && "lg:justify-center lg:px-0")} href={item.href} onClick={onCloseMobile}><Icon className="size-4.5 shrink-0"/><span className={cn(collapsed && "lg:sr-only")}>{t(`navigation.${item.key}`)}</span>{(item.key === "business" || item.key === "control") && !collapsed ? <ChevronDown className="ml-auto size-3.5"/> : null}</Link>
              </Tooltip>
              {!collapsed && ((item.key === "business" && inProfile) || (item.key === "control" && inSecurity)) ? <div className="ml-7 mt-1 grid gap-1 border-l border-slate-200 pl-3 dark:border-slate-800">
                {(item.key === "business" ? [{ key: "profileOverview", path: "/profile", icon: Building2 }, { key: "information", path: "/profile/information", icon: Store }, { key: "brand", path: "/profile/brand", icon: Palette }, { key: "operations", path: "/profile/operations", icon: Building2 }] : [{ key: "securityOverview", path: "/security", icon: LockKeyhole }, { key: "audit", path: "/security/audit", icon: LockKeyhole }, { key: "protectedControls", path: "/security/control", icon: LockKeyhole }]).map((sub) => <Link className="rounded-lg px-3 py-2 text-xs text-slate-500 hover:bg-slate-50 hover:text-slate-950 dark:hover:bg-slate-900 dark:hover:text-white" href={`/workspace/${businessId}${sub.path}`} key={sub.key} onClick={onCloseMobile}>{t(`subnavigation.${sub.key}`)}</Link>)}
              </div> : null}
            </div>;
          })}
          {items.map((item) => {
            const Icon = item.icon;
            const content = (
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
              <Tooltip content={t("availableAfterIntegration")} key={item.key}>
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
