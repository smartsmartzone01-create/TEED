import type { LucideIcon } from "lucide-react";

type DashboardDestination =
  | "/dashboard"
  | "/dashboard/billing"
  | "/dashboard/help"
  | "/dashboard/notifications"
  | "/dashboard/preferences"
  | "/dashboard/profile"
  | "/dashboard/security"
  | "/dashboard/workspaces";

type DashboardNavigationItem = {
  href: DashboardDestination;
  icon: LucideIcon;
  key:
    | "billing"
    | "help"
    | "notifications"
    | "overview"
    | "preferences"
    | "profile"
    | "security"
    | "workspaces";
};

export type {
  DashboardDestination,
  DashboardNavigationItem,
};
