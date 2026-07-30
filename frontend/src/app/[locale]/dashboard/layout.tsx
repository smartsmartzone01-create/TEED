import type { ReactNode } from "react";

import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { IdentityAccessBoundary } from "@/components/identity/identity-access-boundary";
import { ProfileProvider } from "@/providers/profile/profile-provider";

type DashboardLayoutProps = {
  children: ReactNode;
};

export default function DashboardLayout({
  children,
}: DashboardLayoutProps) {
  return (
    <IdentityAccessBoundary access="dashboard">
      <ProfileProvider>
        <DashboardShell>{children}</DashboardShell>
      </ProfileProvider>
    </IdentityAccessBoundary>
  );
}
