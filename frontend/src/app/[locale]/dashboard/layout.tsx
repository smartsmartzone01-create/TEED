import type { ReactNode } from "react";

import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { IdentityAccessBoundary } from "@/components/identity/identity-access-boundary";

type DashboardLayoutProps = {
  children: ReactNode;
};

export default function DashboardLayout({
  children,
}: DashboardLayoutProps) {
  return (
    <IdentityAccessBoundary access="dashboard">
      <DashboardShell>{children}</DashboardShell>
    </IdentityAccessBoundary>
  );
}
