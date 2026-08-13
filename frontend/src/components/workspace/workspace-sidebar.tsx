"use client";

import { Building2, ChevronDown, ChevronLeft, ChevronRight, Inbox, LayoutDashboard, LockKeyhole, MailPlus, MapPin, Palette, Settings2, ShieldCheck, ShoppingBag, Store, UserRoundCog, UsersRound, X, type LucideIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { usePathname } from "next/navigation";
import { useMemo, useState } from "react";

import { BrandMark } from "@/components/global/brand/brand-mark";
import { Tooltip } from "@/components/global/primitives/tooltip";
import { WorkspaceAccountMenu } from "@/components/workspace/workspace-account-menu";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/global/class-names";
import { useWorkspace } from "@/providers/workspace/workspace-provider";

type WorkspaceSidebarProps = { collapsed: boolean; mobileOpen: boolean; onCloseMobile: () => void; onToggleCollapsed: () => void };
type NavigationGroupKey = "commerce" | "membership" | "profile" | "settingsSecurity";
type NavigationItem = { icon: LucideIcon; key: string; path: string };

const membershipItems: NavigationItem[] = [
  { icon: UsersRound, key: "members", path: "/members" },
  { icon: MailPlus, key: "invitations", path: "/invitations" },
  { icon: Inbox, key: "accessRequests", path: "/access-requests" },
  { icon: UserRoundCog, key: "roles", path: "/roles" },
];
const profileItems: NavigationItem[] = [
  { icon: Building2, key: "profileOverview", path: "/profile" },
  { icon: Store, key: "information", path: "/profile/information" },
  { icon: Palette, key: "brand", path: "/profile/brand" },
  { icon: MapPin, key: "operations", path: "/profile/operations" },
];
const settingsItems: NavigationItem[] = [
  { icon: ShieldCheck, key: "settingsOverview", path: "/administration" },
  { icon: Settings2, key: "workspacePreferences", path: "/settings" },
  { icon: LockKeyhole, key: "audit", path: "/security/audit" },
  { icon: ShieldCheck, key: "businessLifecycle", path: "/security/control" },
];
const commerceItems: NavigationItem[] = [
  { icon: LayoutDashboard, key: "commerceOverview", path: "/commerce" },
  { icon: Store, key: "products", path: "/commerce/products" },
  { icon: Building2, key: "inventory", path: "/commerce/inventory" },
  { icon: ShoppingBag, key: "sales", path: "/commerce/sales" },
  { icon: Inbox, key: "returns", path: "/commerce/returns" },
  { icon: Settings2, key: "expenses", path: "/commerce/expenses" },
  { icon: ShieldCheck, key: "budgets", path: "/commerce/budgets" },
];

function groupForPath(pathname: string): NavigationGroupKey | null {
  if (pathname.includes("/commerce")) return "commerce";
  if (/\/(members|invitations|access-requests|roles)(\/|$)/.test(pathname)) return "membership";
  if (pathname.includes("/profile")) return "profile";
  if (pathname.includes("/administration") || pathname.includes("/settings") || pathname.includes("/security")) return "settingsSecurity";
  return null;
}

function WorkspaceSidebar({ collapsed, mobileOpen, onCloseMobile, onToggleCollapsed }: WorkspaceSidebarProps) {
  const t = useTranslations("WorkspaceShell");
  const pathname = usePathname();
  const { businesses } = useWorkspace();
  const businessId = useMemo(() => pathname.match(/\/workspace\/([^/]+)/)?.[1] ?? null, [pathname]);
  const commerceEnabled = businesses.find((business) => business.id === businessId)?.capabilities.includes("business_operations") ?? false;
  const activeGroup = groupForPath(pathname);
  const [accordion, setAccordion] = useState<{
    group: NavigationGroupKey | null;
    pathname: string;
  }>({ group: activeGroup, pathname });
  const openGroup = accordion.pathname === pathname ? accordion.group : activeGroup;

  const groups: Array<{ icon: LucideIcon; items: NavigationItem[]; key: NavigationGroupKey }> = [
    { icon: ShoppingBag, items: commerceItems, key: "commerce" },
    { icon: UsersRound, items: membershipItems, key: "membership" },
    { icon: Building2, items: profileItems, key: "profile" },
    { icon: Settings2, items: settingsItems, key: "settingsSecurity" },
  ];
  function toggleGroup(key: NavigationGroupKey) {
    if (collapsed) onToggleCollapsed();
    setAccordion({ group: openGroup === key ? null : key, pathname });
  }

  return <>
    <button aria-label={t("closeNavigation")} className={cn("fixed inset-0 z-40 bg-slate-950/25 backdrop-blur-sm lg:hidden", mobileOpen ? "block" : "hidden")} onClick={onCloseMobile} type="button" />
    <aside className={cn("fixed inset-y-0 left-0 z-50 flex w-[min(18rem,88vw)] flex-col border-r border-slate-200 bg-white text-slate-950", "transition-[width,transform] duration-300 ease-out dark:border-slate-800 dark:bg-slate-950 dark:text-white", collapsed ? "lg:w-[5.25rem]" : "lg:w-72", mobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0")}>
      <div className="flex h-18 shrink-0 items-center justify-between border-b border-slate-200 px-4 dark:border-slate-800">
        <BrandMark className={cn("text-2xl", collapsed && "lg:sr-only")} href="/workspace" tone="adaptive" />
        <button aria-label={t(collapsed ? "expandSidebar" : "collapseSidebar")} className="hidden size-9 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-950 dark:hover:bg-slate-900 dark:hover:text-white lg:inline-flex" onClick={onToggleCollapsed} type="button">{collapsed ? <ChevronRight className="size-4" /> : <ChevronLeft className="size-4" />}</button>
        <button aria-label={t("closeNavigation")} className="inline-flex size-9 items-center justify-center rounded-lg hover:bg-slate-100 dark:hover:bg-slate-900 lg:hidden" onClick={onCloseMobile} type="button"><X className="size-4" /></button>
      </div>
      <nav aria-label={t("primaryNavigation")} className="flex-1 space-y-1 overflow-y-auto px-3 py-5">
        {businessId ? <Tooltip content={t("navigation.overview")}><Link aria-current={pathname === `/workspace/${businessId}` ? "page" : undefined} className={cn("flex min-h-11 items-center gap-3 rounded-xl px-3 text-sm font-semibold", pathname === `/workspace/${businessId}` ? "bg-slate-100 text-slate-950 dark:bg-slate-900 dark:text-white" : "text-slate-600 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-900", collapsed && "lg:justify-center lg:px-0")} href={`/workspace/${businessId}`} onClick={onCloseMobile}><LayoutDashboard className="size-4.5 shrink-0" /><span className={cn(collapsed && "lg:sr-only")}>{t("navigation.overview")}</span></Link></Tooltip> : null}
        {businessId ? groups.filter((group) => group.key !== "commerce" || commerceEnabled).map((group) => {
          const Icon = group.icon;
          const expanded = openGroup === group.key && !collapsed;
          const groupActive = activeGroup === group.key;
          const panelId = `workspace-navigation-${group.key}`;
          return <div key={group.key}>
            <Tooltip content={t(`navigation.${group.key}`)}><button aria-controls={panelId} aria-expanded={expanded} className={cn("flex min-h-11 w-full items-center gap-3 rounded-xl px-3 text-left text-sm font-semibold", groupActive ? "bg-slate-100 text-slate-950 dark:bg-slate-900 dark:text-white" : "text-slate-600 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-900", collapsed && "lg:justify-center lg:px-0")} onClick={() => toggleGroup(group.key)} type="button"><Icon className="size-4.5 shrink-0" /><span className={cn(collapsed && "lg:sr-only")}>{t(`navigation.${group.key}`)}</span>{!collapsed ? <ChevronDown className={cn("ml-auto size-3.5 transition-transform", expanded && "rotate-180")} /> : null}</button></Tooltip>
            {expanded ? <div className="ml-7 mt-1 grid gap-1 border-l border-slate-200 pl-3 dark:border-slate-800" id={panelId}>{group.items.map((item) => {
              const href = `/workspace/${businessId}${item.path}`;
              const selected = pathname === href;
              return <Link aria-current={selected ? "page" : undefined} className={cn("rounded-lg px-3 py-2 text-xs", selected ? "bg-slate-100 font-semibold text-slate-950 dark:bg-slate-900 dark:text-white" : "text-slate-500 hover:bg-slate-50 hover:text-slate-950 dark:hover:bg-slate-900 dark:hover:text-white")} href={href} key={item.key} onClick={onCloseMobile}>{t(`subnavigation.${item.key}`)}</Link>;
            })}</div> : null}
          </div>;
        }) : null}
      </nav>
      <div className="shrink-0 border-t border-slate-200 p-3 dark:border-slate-800"><WorkspaceAccountMenu compact={collapsed} /></div>
    </aside>
  </>;
}

export { WorkspaceSidebar };
