import type { ReactNode } from "react";

import { IdentityHeader } from "@/components/identity/identity-header";

type WorkspaceDirectoryShellProps = {
  children: ReactNode;
};

function WorkspaceDirectoryShell({ children }: WorkspaceDirectoryShellProps) {
  return (
    <div className="min-h-svh bg-background text-slate-950 dark:text-slate-50">
      <IdentityHeader />

      <main className="mx-auto w-full max-w-[96rem] px-4 pb-10 pt-5 sm:px-6 sm:pb-12 sm:pt-7 lg:px-8">
        {children}
      </main>
    </div>
  );
}

export { WorkspaceDirectoryShell };
