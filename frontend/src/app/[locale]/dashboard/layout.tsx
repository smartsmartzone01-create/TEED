import type { ReactNode } from "react";

import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { IdentityAccessBoundary } from "@/components/identity/identity-access-boundary";
import { PreferencesProvider } from "@/providers/dashboard/preferences-provider";
import { ProfileProvider } from "@/providers/profile/profile-provider";

type DashboardLayoutProps = {
  children: ReactNode;
};

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  return (
    <IdentityAccessBoundary access="dashboard">
      <PreferencesProvider>
        <ProfileProvider>
          <DashboardShell>{children}</DashboardShell>
        </ProfileProvider>
      </PreferencesProvider>
    </IdentityAccessBoundary>
  );
}
