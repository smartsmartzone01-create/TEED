import type { ReactNode } from "react";

import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { IdentityAccessBoundary } from "@/components/identity/identity-access-boundary";
import { PreferencesProvider } from "@/providers/dashboard/preferences-provider";
import { ProfileProvider } from "@/providers/profile/profile-provider";
import { SecurityProvider } from "@/providers/security/security-provider";
import { NotificationsProvider } from "@/providers/notifications/notifications-provider";
import { WorkspaceProvider } from "@/providers/workspace/workspace-provider";

type DashboardLayoutProps = {
  children: ReactNode;
};

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  return (
    <IdentityAccessBoundary access="dashboard">
      <PreferencesProvider>
        <ProfileProvider>
          <SecurityProvider>
            <NotificationsProvider>
              <WorkspaceProvider>
                <DashboardShell>{children}</DashboardShell>
              </WorkspaceProvider>
            </NotificationsProvider>
          </SecurityProvider>
        </ProfileProvider>
      </PreferencesProvider>
    </IdentityAccessBoundary>
  );
}
