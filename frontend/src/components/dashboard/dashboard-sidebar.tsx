"use client";

import {
  Bell,
  BriefcaseBusiness,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  LayoutDashboard,
  LockKeyhole,
  Settings2,
  Sparkles,
  UserRound,
  X,
  type LucideIcon,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";

import { DashboardAccountMenu } from "@/components/dashboard/dashboard-account-menu";
import { BrandMark } from "@/components/global/brand/brand-mark";
import { Tooltip } from "@/components/global/primitives/tooltip";
import { profileLinks } from "@/components/profile/profile-navigation";
import { securityLinks } from "@/components/security/security-navigation";
import { Link, usePathname } from "@/i18n/navigation";
import { cn } from "@/lib/global/class-names";

type DashboardSidebarProps = {
  collapsed: boolean;
  mobileOpen: boolean;
  onCloseMobile: () => void;
  onToggleCollapsed: () => void;
};

type GroupKey = "profile" | "security" | "workspaces";
type GroupLink = { href: string; key: string };

const workspaceLinks: GroupLink[] = [
  { href: "/dashboard/workspaces", key: "overview" },
  { href: "/dashboard/workspaces/create", key: "create" },
  { href: "/dashboard/workspaces/access", key: "requestAccess" },
];

const standaloneItems: Array<{ href: string; icon: LucideIcon; key: string }> = [
  { href: "/dashboard/preferences", icon: Settings2, key: "preferences" },
  { href: "/dashboard/notifications", icon: Bell, key: "notifications" },
  { href: "/dashboard/ai", icon: Sparkles, key: "ai" },
];

function groupForPath(pathname: string): GroupKey | null {
  if (pathname.startsWith("/dashboard/profile")) return "profile";
  if (pathname.startsWith("/dashboard/security")) return "security";
  if (pathname.startsWith("/dashboard/workspaces")) return "workspaces";
  return null;
}

function DashboardSidebar({
  collapsed,
  mobileOpen,
  onCloseMobile,
  onToggleCollapsed,
}: DashboardSidebarProps) {
  const pathname = usePathname();
  const t = useTranslations("DashboardShell");
  const profileT = useTranslations("ProfileNavigation");
  const securityT = useTranslations("SecurityNavigation");
  const activeGroup = groupForPath(pathname);
  const [accordion, setAccordion] = useState<{
    group: GroupKey | null;
    pathname: string;
  }>({ group: activeGroup, pathname });
  const openGroup = accordion.pathname === pathname ? accordion.group : activeGroup;

  const groups: Array<{
    icon: LucideIcon;
    key: GroupKey;
    links: readonly GroupLink[];
  }> = [
    { icon: UserRound, key: "profile", links: profileLinks },
    { icon: LockKeyhole, key: "security", links: securityLinks },
    { icon: BriefcaseBusiness, key: "workspaces", links: workspaceLinks },
  ];

  function toggleGroup(key: GroupKey) {
    if (collapsed) onToggleCollapsed();
    setAccordion({ group: openGroup === key ? null : key, pathname });
  }

  function nestedLabel(group: GroupKey, key: string) {
    if (group === "profile") return profileT(key);
    if (group === "security") return securityT(key);
    return t(`subnavigation.workspaces.${key}`);
  }

  function standaloneLink(item: { href: string; icon: LucideIcon; key: string }) {
    const Icon = item.icon;
    const active = pathname.startsWith(item.href);
    return (
      <Tooltip content={t(`navigation.${item.key}`)} key={item.href}>
        <Link
          aria-current={active ? "page" : undefined}
          className={cn(
            "flex min-h-11 items-center gap-3 rounded-xl px-3 text-sm font-medium transition-colors",
            active
              ? "bg-slate-900 text-white shadow-sm dark:bg-white dark:text-slate-950"
              : "text-slate-600 hover:bg-slate-100 hover:text-slate-950 dark:text-slate-400 dark:hover:bg-slate-900 dark:hover:text-white",
            collapsed && "lg:justify-center lg:px-0",
          )}
          href={item.href}
          onClick={onCloseMobile}
        >
          <Icon className="size-4.5 shrink-0" />
          <span className={cn(collapsed && "lg:sr-only")}>{t(`navigation.${item.key}`)}</span>
        </Link>
      </Tooltip>
    );
  }

  function groupNavigation(group: (typeof groups)[number]) {
    const Icon = group.icon;
    const expanded = openGroup === group.key && !collapsed;
    const active = activeGroup === group.key;
    const panelId = `dashboard-navigation-${group.key}`;
    return (
      <div key={group.key}>
        <Tooltip content={t(`navigation.${group.key}`)}>
          <button
            aria-controls={panelId}
            aria-expanded={expanded}
            className={cn(
              "flex min-h-11 w-full items-center gap-3 rounded-xl px-3 text-left text-sm font-medium",
              active
                ? "bg-slate-900 text-white shadow-sm dark:bg-white dark:text-slate-950"
                : "text-slate-600 hover:bg-slate-100 hover:text-slate-950 dark:text-slate-400 dark:hover:bg-slate-900 dark:hover:text-white",
              collapsed && "lg:justify-center lg:px-0",
            )}
            onClick={() => toggleGroup(group.key)}
            type="button"
          >
            <Icon className="size-4.5 shrink-0" />
            <span className={cn(collapsed && "lg:sr-only")}>{t(`navigation.${group.key}`)}</span>
            {!collapsed ? <ChevronDown className={cn("ml-auto size-3.5 transition-transform", expanded && "rotate-180")} /> : null}
          </button>
        </Tooltip>
        {expanded ? (
          <div className="ml-7 mt-1 grid gap-1 border-l border-slate-200 pl-3 dark:border-slate-800" id={panelId}>
            {group.links.map((link) => {
              const selected = link.href === `/dashboard/${group.key}` ? pathname === link.href : pathname.startsWith(link.href);
              return (
                <Link
                  aria-current={selected ? "page" : undefined}
                  className={cn(
                    "rounded-lg px-3 py-2 text-xs font-medium",
                    selected
                      ? "bg-slate-100 text-slate-950 dark:bg-slate-900 dark:text-white"
                      : "text-slate-500 hover:bg-slate-50 hover:text-slate-950 dark:text-slate-400 dark:hover:bg-slate-900 dark:hover:text-white",
                  )}
                  href={link.href}
                  key={link.key}
                  onClick={onCloseMobile}
                >
                  {nestedLabel(group.key, link.key)}
                </Link>
              );
            })}
          </div>
        ) : null}
      </div>
    );
  }

  return (
    <>
      <button
        aria-label={t("closeNavigation")}
        className={cn(
          "fixed inset-0 z-40 bg-slate-950/30 backdrop-blur-sm lg:hidden",
          mobileOpen ? "block" : "hidden",
        )}
        onClick={onCloseMobile}
        type="button"
      />
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex w-[min(18rem,88vw)] flex-col border-r border-slate-200 bg-white text-slate-900 shadow-xl",
          "transition-[width,transform] duration-300 ease-out dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100",
          collapsed ? "lg:w-[5.25rem]" : "lg:w-72",
          mobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0",
        )}
      >
        <div className="flex h-18 shrink-0 items-center justify-between border-b border-slate-200 px-4 dark:border-slate-800">
          <BrandMark className={cn("text-2xl", collapsed && "lg:sr-only")} href="/dashboard" tone="adaptive" />
          <button
            aria-label={t(collapsed ? "expandSidebar" : "collapseSidebar")}
            className="hidden size-9 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-900 dark:hover:bg-slate-900 dark:hover:text-white lg:inline-flex"
            onClick={onToggleCollapsed}
            type="button"
          >
            {collapsed ? <ChevronRight className="size-4" /> : <ChevronLeft className="size-4" />}
          </button>
          <button aria-label={t("closeNavigation")} className="inline-flex size-9 items-center justify-center rounded-lg hover:bg-slate-100 dark:hover:bg-slate-900 lg:hidden" onClick={onCloseMobile} type="button"><X className="size-4" /></button>
        </div>

        <nav aria-label={t("primaryNavigation")} className="flex-1 space-y-1 overflow-y-auto px-3 py-5">
          <Tooltip content={t("navigation.overview")}>
            <Link
              aria-current={pathname === "/dashboard" ? "page" : undefined}
              className={cn(
                "flex min-h-11 items-center gap-3 rounded-xl px-3 text-sm font-medium",
                pathname === "/dashboard"
                  ? "bg-slate-900 text-white shadow-sm dark:bg-white dark:text-slate-950"
                  : "text-slate-600 hover:bg-slate-100 hover:text-slate-950 dark:text-slate-400 dark:hover:bg-slate-900 dark:hover:text-white",
                collapsed && "lg:justify-center lg:px-0",
              )}
              href="/dashboard"
              onClick={onCloseMobile}
            >
              <LayoutDashboard className="size-4.5 shrink-0" />
              <span className={cn(collapsed && "lg:sr-only")}>{t("navigation.overview")}</span>
            </Link>
          </Tooltip>

          {groupNavigation(groups[0])}
          {standaloneLink(standaloneItems[0])}
          {groupNavigation(groups[1])}
          {standaloneLink(standaloneItems[1])}
          {groupNavigation(groups[2])}
          <div className="my-3 border-t border-slate-200 dark:border-slate-800" />
          {standaloneLink(standaloneItems[2])}
        </nav>
        <div className="shrink-0 border-t border-slate-200 p-3 dark:border-slate-800"><DashboardAccountMenu compact={collapsed} /></div>
      </aside>
    </>
  );
}

export { DashboardSidebar };
