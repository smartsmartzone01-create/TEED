import type { ReactNode } from "react";

import { IdentityBackground } from "@/components/identity/identity-background";
import { IdentityHeader } from "@/components/identity/identity-header";

type WorkspaceDirectoryShellProps = {
  children: ReactNode;
};

function WorkspaceDirectoryShell({ children }: WorkspaceDirectoryShellProps) {
  return (
    <div className="relative min-h-svh overflow-hidden text-slate-950 dark:text-slate-50">
      <IdentityBackground />
      <IdentityHeader />

      <main className="relative z-10 mx-auto w-full max-w-[96rem] px-4 pb-10 pt-3 sm:px-6 sm:pb-12 sm:pt-5 lg:px-8">
        {children}
      </main>
    </div>
  );
}

export { WorkspaceDirectoryShell };
