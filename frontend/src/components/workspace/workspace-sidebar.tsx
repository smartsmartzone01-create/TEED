"use client";

import {
  Building2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  FolderKanban,
  Inbox,
  LayoutDashboard,
  LockKeyhole,
  MailPlus,
  MapPin,
  Palette,
  Plus,
  Settings2,
  ShieldCheck,
  ShoppingBag,
  Store,
  UserPlus,
  UserRoundCog,
  UsersRound,
  X,
  type LucideIcon,
} from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { usePathname } from "next/navigation";
import { useMemo, useState } from "react";

import { BrandMark } from "@/components/global/brand/brand-mark";
import { Tooltip } from "@/components/global/primitives/tooltip";
import { WorkspaceAccountMenu } from "@/components/workspace/workspace-account-menu";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/global/class-names";
import { useWorkspace } from "@/providers/workspace/workspace-provider";

type WorkspaceSidebarProps = {
  collapsed: boolean;
  mobileOpen: boolean;
  onCloseMobile: () => void;
  onToggleCollapsed: () => void;
};
type NavigationGroupKey = "commerce" | "membership" | "profile" | "settingsSecurity";
type NavigationItem = { icon: LucideIcon; key: string; path: string };
type NavigationGroup = { icon: LucideIcon; items: NavigationItem[]; key: NavigationGroupKey };

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
  if (
    pathname.includes("/administration") ||
    pathname.includes("/settings") ||
    pathname.includes("/security")
  ) {
    return "settingsSecurity";
  }
  return null;
}

function WorkspaceSidebar({
  collapsed,
  mobileOpen,
  onCloseMobile,
  onToggleCollapsed,
}: WorkspaceSidebarProps) {
  const t = useTranslations("WorkspaceShell");
  const directoryT = useTranslations("WorkspaceRefinement.directory");
  const locale = useLocale();
  const pathname = usePathname();
  const { businesses } = useWorkspace();
  const businessId = useMemo(
    () => pathname.match(/\/workspace\/([^/]+)/)?.[1] ?? null,
    [pathname],
  );
  const activeBusiness = businesses.find((business) => business.id === businessId);
  const commerceEnabled = Boolean(
    activeBusiness?.capabilities.includes("business_operations") &&
      activeBusiness.membership.permissions.includes("commerce.view"),
  );
  const collaborationEnabled = Boolean(
    activeBusiness?.capabilities.includes("team_collaboration"),
  );
  const activeGroup = groupForPath(pathname);
  const [accordion, setAccordion] = useState<{
    group: NavigationGroupKey | null;
    pathname: string;
  }>({ group: activeGroup, pathname });
  const openGroup = accordion.pathname === pathname ? accordion.group : activeGroup;

  const operationsGroups: NavigationGroup[] = [
    { icon: ShoppingBag, items: commerceItems, key: "commerce" },
  ];
  const administrationGroups: NavigationGroup[] = [
    { icon: Building2, items: profileItems, key: "profile" },
    { icon: UsersRound, items: membershipItems, key: "membership" },
    { icon: Settings2, items: settingsItems, key: "settingsSecurity" },
  ];

  const homeLabel = locale === "sw" ? "Mwanzo" : "Home";
  const operationsLabel = locale === "sw" ? "Uendeshaji" : "Operations";
  const administrationLabel = locale === "sw" ? "Usimamizi" : "Administration";
  const workspaceLabel = locale === "sw" ? "Eneo la kazi" : "Workspace";
  const commerceLabel = locale === "sw" ? "Biashara" : "Commerce";

  function toggleGroup(key: NavigationGroupKey) {
    if (collapsed) onToggleCollapsed();
    setAccordion({ group: openGroup === key ? null : key, pathname });
  }

  function groupLabel(key: NavigationGroupKey) {
    if (key === "commerce") return commerceLabel;
    return t(`navigation.${key}`);
  }

  function renderGroup(group: NavigationGroup) {
    const Icon = group.icon;
    const expanded = openGroup === group.key && !collapsed;
    const groupActive = activeGroup === group.key;
    const panelId = `workspace-navigation-${group.key}`;

    return (
      <div key={group.key}>
        <Tooltip content={groupLabel(group.key)}>
          <button
            aria-controls={panelId}
            aria-expanded={expanded}
            className={cn(
              "flex min-h-7 w-full items-center gap-2 rounded-md px-2.5 text-left text-[11px] font-semibold leading-4",
              groupActive
                ? "bg-slate-100 text-slate-950 dark:bg-slate-900 dark:text-white"
                : "text-slate-900 hover:bg-slate-50 dark:text-slate-100 dark:hover:bg-slate-900",
              collapsed && "lg:justify-center lg:px-0",
            )}
            onClick={() => toggleGroup(group.key)}
            type="button"
          >
            <Icon className="size-3 shrink-0" />
            <span className={cn(collapsed && "lg:sr-only")}>{groupLabel(group.key)}</span>
            {!collapsed ? (
              <ChevronDown
                className={cn(
                  "ml-auto size-2.5 text-slate-400 transition-transform",
                  expanded && "rotate-180",
                )}
              />
            ) : null}
          </button>
        </Tooltip>
        {expanded ? (
          <div
            className="ml-4 mt-0.5 grid gap-0.5 border-l border-slate-200 pl-2.5 dark:border-slate-800"
            id={panelId}
          >
            {group.items.map((item) => {
              const href = `/workspace/${businessId}${item.path}`;
              const selected = pathname === href;
              return (
                <Link
                  aria-current={selected ? "page" : undefined}
                  className={cn(
                    "rounded-md px-2 py-1 text-[10px] leading-4",
                    selected
                      ? "bg-slate-100 font-semibold text-slate-950 dark:bg-slate-900 dark:text-white"
                      : "text-slate-500 hover:bg-slate-50 hover:text-slate-950 dark:hover:bg-slate-900 dark:hover:text-white",
                  )}
                  href={href}
                  key={item.key}
                  onClick={onCloseMobile}
                >
                  {t(`subnavigation.${item.key}`)}
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
          "fixed inset-0 z-40 bg-slate-950/25 backdrop-blur-sm lg:hidden",
          mobileOpen ? "block" : "hidden",
        )}
        onClick={onCloseMobile}
        type="button"
      />
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex w-[min(16rem,88vw)] flex-col border-r border-slate-200 bg-white text-slate-950",
          "transition-[width,transform] duration-300 ease-out dark:border-slate-800 dark:bg-slate-950 dark:text-white",
          collapsed ? "lg:w-[5.25rem]" : "lg:w-64",
          mobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0",
        )}
      >
        <div className="flex h-14 shrink-0 items-center justify-between border-b border-slate-200 px-3 dark:border-slate-800">
          <BrandMark
            className={cn("text-xl", collapsed && "lg:sr-only")}
            href="/workspaces"
            tone="adaptive"
          />
          <button
            aria-label={t(collapsed ? "expandSidebar" : "collapseSidebar")}
            className="hidden size-8 items-center justify-center rounded-md text-slate-500 hover:bg-slate-100 hover:text-slate-950 dark:hover:bg-slate-900 dark:hover:text-white lg:inline-flex"
            onClick={onToggleCollapsed}
            type="button"
          >
            {collapsed ? (
              <ChevronRight className="size-3.5" />
            ) : (
              <ChevronLeft className="size-3.5" />
            )}
          </button>
          <button
            aria-label={t("closeNavigation")}
            className="inline-flex size-8 items-center justify-center rounded-md hover:bg-slate-100 dark:hover:bg-slate-900 lg:hidden"
            onClick={onCloseMobile}
            type="button"
          >
            <X className="size-3.5" />
          </button>
        </div>

        <nav
          aria-label={t("primaryNavigation")}
          className="flex-1 overflow-y-auto px-3 py-4"
        >
          {businessId ? (
            <Tooltip content={homeLabel}>
              <Link
                aria-current={pathname === `/workspace/${businessId}` ? "page" : undefined}
                className={cn(
                  "flex min-h-7 items-center gap-2 rounded-md px-2.5 text-[11px] font-semibold leading-4",
                  pathname === `/workspace/${businessId}`
                    ? "bg-slate-100 text-slate-950 dark:bg-slate-900 dark:text-white"
                    : "text-slate-900 hover:bg-slate-50 dark:text-slate-100 dark:hover:bg-slate-900",
                  collapsed && "lg:justify-center lg:px-0",
                )}
                href={`/workspace/${businessId}`}
                onClick={onCloseMobile}
              >
                <LayoutDashboard className="size-3 shrink-0" />
                <span className={cn(collapsed && "lg:sr-only")}>{homeLabel}</span>
              </Link>
            </Tooltip>
          ) : null}

          {businessId && commerceEnabled ? (
            <div className="mt-5">
              <p
                className={cn(
                  "mb-1.5 px-2.5 text-[8px] font-semibold uppercase tracking-[0.12em] text-slate-400",
                  collapsed && "lg:sr-only",
                )}
              >
                {operationsLabel}
              </p>
              <div className="grid gap-0.5">{operationsGroups.map(renderGroup)}</div>
            </div>
          ) : null}

          {businessId ? (
            <div className="mt-5">
              <p
                className={cn(
                  "mb-1.5 px-2.5 text-[8px] font-semibold uppercase tracking-[0.12em] text-slate-400",
                  collapsed && "lg:sr-only",
                )}
              >
                {administrationLabel}
              </p>
              <div className="grid gap-0.5">
                {administrationGroups
                  .filter((group) => group.key !== "membership" || collaborationEnabled)
                  .map(renderGroup)}
              </div>
            </div>
          ) : null}

          <div className="mt-5">
            <p
              className={cn(
                "mb-1.5 px-2.5 text-[8px] font-semibold uppercase tracking-[0.12em] text-slate-400",
                collapsed && "lg:sr-only",
              )}
            >
              {workspaceLabel}
            </p>
            <div className="grid gap-0.5">
              <Tooltip content={directoryT("embeddedTitle")}>
                <Link
                  className={cn(
                    "flex min-h-7 items-center gap-2 rounded-md px-2.5 text-[11px] font-medium leading-4 text-slate-600 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-900",
                    collapsed && "lg:justify-center lg:px-0",
                  )}
                  href="/workspaces"
                  onClick={onCloseMobile}
                >
                  <FolderKanban className="size-3 shrink-0" />
                  <span className={cn(collapsed && "lg:sr-only")}>{directoryT("embeddedTitle")}</span>
                </Link>
              </Tooltip>
              <Tooltip content={directoryT("create")}>
                <Link
                  className={cn(
                    "flex min-h-7 items-center gap-2 rounded-md px-2.5 text-[11px] font-medium leading-4 text-slate-600 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-900",
                    collapsed && "lg:justify-center lg:px-0",
                  )}
                  href="/dashboard/workspaces/create"
                  onClick={onCloseMobile}
                >
                  <Plus className="size-3 shrink-0" />
                  <span className={cn(collapsed && "lg:sr-only")}>{directoryT("create")}</span>
                </Link>
              </Tooltip>
              <Tooltip content={directoryT("request")}>
                <Link
                  className={cn(
                    "flex min-h-7 items-center gap-2 rounded-md px-2.5 text-[11px] font-medium leading-4 text-slate-600 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-900",
                    collapsed && "lg:justify-center lg:px-0",
                  )}
                  href="/dashboard/workspaces/access"
                  onClick={onCloseMobile}
                >
                  <UserPlus className="size-3 shrink-0" />
                  <span className={cn(collapsed && "lg:sr-only")}>{directoryT("request")}</span>
                </Link>
              </Tooltip>
            </div>
          </div>
        </nav>

        <div className="shrink-0 border-t border-slate-200 p-3 dark:border-slate-800">
          <WorkspaceAccountMenu compact={collapsed} />
        </div>
      </aside>
    </>
  );
}

export { WorkspaceSidebar };
