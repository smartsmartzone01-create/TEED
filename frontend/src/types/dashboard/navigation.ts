import type { LucideIcon } from "lucide-react";

type DashboardDestination =
  | "/dashboard"
  | "/dashboard/ai"
  | "/dashboard/billing"
  | "/dashboard/help"
  | "/dashboard/notifications"
  | "/dashboard/preferences"
  | "/dashboard/profile"
  | "/dashboard/profile/contacts"
  | "/dashboard/profile/edit"
  | "/dashboard/profile/personal"
  | "/dashboard/security"
  | "/dashboard/security/activity"
  | "/dashboard/security/password"
  | "/dashboard/security/sessions"
  | "/dashboard/workspaces"
  | "/dashboard/workspaces/access"
  | "/dashboard/workspaces/create";

type DashboardNavigationItem = {
  href: DashboardDestination;
  icon: LucideIcon;
  key:
    | "billing"
    | "help"
    | "ai"
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
