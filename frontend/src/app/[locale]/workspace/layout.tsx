import type { ReactNode } from "react";

import { IdentityAccessBoundary } from "@/components/identity/identity-access-boundary";
import { WorkspaceShell } from "@/components/workspace/workspace-shell";

type WorkspaceLayoutProps = {
  children: ReactNode;
};

export default function WorkspaceLayout({ children }: WorkspaceLayoutProps) {
  return (
    <IdentityAccessBoundary access="dashboard">
      <WorkspaceShell>{children}</WorkspaceShell>
    </IdentityAccessBoundary>
  );
}
