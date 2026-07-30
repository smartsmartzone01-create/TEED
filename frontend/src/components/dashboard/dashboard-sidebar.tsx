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
} from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";

import { DashboardAccountMenu } from "@/components/dashboard/dashboard-account-menu";
import { BrandMark } from "@/components/global/brand/brand-mark";
import { Tooltip } from "@/components/global/primitives/tooltip";
import { profileLinks } from "@/components/profile/profile-navigation";
import { Link, usePathname } from "@/i18n/navigation";
import { cn } from "@/lib/global/class-names";
import type { DashboardNavigationItem } from "@/types/dashboard/navigation";

type DashboardSidebarProps = {
  collapsed: boolean;
  mobileOpen: boolean;
  onCloseMobile: () => void;
  onToggleCollapsed: () => void;
};

const navigationItems: DashboardNavigationItem[] = [
  { href: "/dashboard", icon: LayoutDashboard, key: "overview" },
  { href: "/dashboard/ai", icon: Sparkles, key: "ai" },
  { href: "/dashboard/profile", icon: UserRound, key: "profile" },
  {
    href: "/dashboard/preferences",
    icon: Settings2,
    key: "preferences",
  },
  {
    href: "/dashboard/security",
    icon: LockKeyhole,
    key: "security",
  },
  {
    href: "/dashboard/notifications",
    icon: Bell,
    key: "notifications",
  },
  {
    href: "/dashboard/workspaces",
    icon: BriefcaseBusiness,
    key: "workspaces",
  },
];

function DashboardSidebar({
  collapsed,
  mobileOpen,
  onCloseMobile,
  onToggleCollapsed,
}: DashboardSidebarProps) {
  const pathname = usePathname();
  const t = useTranslations("DashboardShell");
  const profileT = useTranslations("ProfileNavigation");
  const [profileOpen, setProfileOpen] = useState(
    pathname.startsWith("/dashboard/profile"),
  );

  const profileExpanded =
    profileOpen || pathname.startsWith("/dashboard/profile");

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
          "fixed inset-y-0 left-0 z-50 flex flex-col border-r",
          "border-slate-200 bg-white text-slate-900 shadow-xl",
          "transition-[width,transform] duration-300 ease-out",
          "dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100",
          collapsed ? "lg:w-[5.25rem]" : "lg:w-72",
          "w-[min(18rem,88vw)]",
          mobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0",
        )}
      >
        <div className="flex h-18 shrink-0 items-center justify-between border-b border-slate-200 px-4 dark:border-slate-800">
          <BrandMark
            className={cn(
              "text-2xl transition-opacity",
              collapsed && "lg:sr-only",
            )}
            href="/dashboard"
            tone="adaptive"
          />

          <button
            aria-label={t(
              collapsed ? "expandSidebar" : "collapseSidebar",
            )}
            className="hidden size-9 items-center justify-center rounded-lg text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-navy/30 dark:hover:bg-slate-900 dark:hover:text-white lg:inline-flex"
            onClick={onToggleCollapsed}
            type="button"
          >
            {collapsed ? (
              <ChevronRight className="size-4" />
            ) : (
              <ChevronLeft className="size-4" />
            )}
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

        <nav
          aria-label={t("primaryNavigation")}
          className="flex-1 space-y-1 overflow-y-auto px-3 py-5"
        >
          {navigationItems.map((item) => {
            const Icon = item.icon;
            const active =
              item.href === "/dashboard"
                ? pathname === item.href
                : pathname.startsWith(item.href);
            const link = (
              <Link
                aria-current={active ? "page" : undefined}
                className={cn(
                  "group flex min-h-11 items-center gap-3 rounded-xl px-3",
                  "text-sm font-medium transition-colors",
                  active
                    ? "bg-slate-900 text-white shadow-sm dark:bg-white dark:text-slate-950"
                    : "text-slate-600 hover:bg-slate-100 hover:text-slate-950 dark:text-slate-400 dark:hover:bg-slate-900 dark:hover:text-white",
                  collapsed && "lg:justify-center lg:px-0",
                )}
                href={item.href}
                onClick={onCloseMobile}
              >
                <Icon className="size-4.5 shrink-0" />
                <span className={cn(collapsed && "lg:sr-only")}>
                  {t(`navigation.${item.key}`)}
                </span>
              </Link>
            );

            const itemContent = collapsed ? (
              <Tooltip
                content={t(`navigation.${item.key}`)}
                key={item.href}
              >
                {link}
              </Tooltip>
            ) : (
              <div key={item.href}>{link}</div>
            );

            if (item.key !== "profile" || collapsed) {
              return itemContent;
            }

            return (
              <div key={item.href}>
                <div className="relative">
                  {link}
                  <button
                    aria-expanded={profileExpanded}
                    aria-label={profileT("toggle")}
                    className="absolute right-2 top-1/2 inline-flex size-8 -translate-y-1/2 items-center justify-center rounded-lg hover:bg-black/10 dark:hover:bg-white/10"
                    onClick={() => setProfileOpen((value) => !value)}
                    type="button"
                  >
                    <ChevronDown
                      className={cn(
                        "size-4 transition-transform",
                        profileExpanded && "rotate-180",
                      )}
                    />
                  </button>
                </div>
                {profileExpanded ? (
                  <div className="ml-7 mt-1 space-y-1 border-l border-slate-200 pl-3 dark:border-slate-800">
                    {profileLinks.map((profileLink) => {
                      const active =
                        profileLink.href === "/dashboard/profile"
                          ? pathname === profileLink.href
                          : pathname.startsWith(profileLink.href);
                      return (
                        <Link
                          aria-current={active ? "page" : undefined}
                          className={cn(
                            "block rounded-lg px-3 py-2 text-xs font-medium transition-colors",
                            active
                              ? "bg-slate-100 text-slate-950 dark:bg-slate-900 dark:text-white"
                              : "text-slate-500 hover:text-slate-950 dark:text-slate-400 dark:hover:text-white",
                          )}
                          href={profileLink.href}
                          key={profileLink.key}
                          onClick={onCloseMobile}
                        >
                          {profileT(profileLink.key)}
                        </Link>
                      );
                    })}
                  </div>
                ) : null}
              </div>
            );
          })}
        </nav>

        <div className="shrink-0 border-t border-slate-200 p-3 dark:border-slate-800">
          <DashboardAccountMenu compact={collapsed} />
        </div>
      </aside>
    </>
  );
}

export { DashboardSidebar };
