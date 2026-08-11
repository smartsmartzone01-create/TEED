"use client";

import { useState, type ReactNode } from "react";

import { WorkspaceHeader } from "@/components/workspace/workspace-header";
import { WorkspaceSidebar } from "@/components/workspace/workspace-sidebar";
import { cn } from "@/lib/global/class-names";

type WorkspaceShellProps = {
  children: ReactNode;
};

function WorkspaceShell({ children }: WorkspaceShellProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="min-h-svh bg-white text-slate-950 dark:bg-slate-950 dark:text-slate-50">
      <WorkspaceSidebar
        collapsed={collapsed}
        mobileOpen={mobileOpen}
        onCloseMobile={() => setMobileOpen(false)}
        onToggleCollapsed={() => setCollapsed((value) => !value)}
      />
      <div
        className={cn(
          "min-h-svh transition-[padding] duration-300 ease-out",
          collapsed ? "lg:pl-[5.25rem]" : "lg:pl-72",
        )}
      >
        <WorkspaceHeader onOpenNavigation={() => setMobileOpen(true)} />
        <main className="mx-auto w-full max-w-[96rem] p-4 sm:p-6 lg:p-8">{children}</main>
      </div>
    </div>
  );
}

export { WorkspaceShell };
