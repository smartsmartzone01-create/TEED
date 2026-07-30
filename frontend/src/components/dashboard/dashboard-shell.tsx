"use client";

import { useState, type ReactNode } from "react";

import { DashboardHeader } from "@/components/dashboard/dashboard-header";
import { DashboardSidebar } from "@/components/dashboard/dashboard-sidebar";
import { cn } from "@/lib/global/class-names";

type DashboardShellProps = {
  children: ReactNode;
};

function DashboardShell({ children }: DashboardShellProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="min-h-svh bg-slate-50 text-slate-950 dark:bg-slate-900 dark:text-slate-50">
      <DashboardSidebar
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
        <DashboardHeader onOpenNavigation={() => setMobileOpen(true)} />
        <main className="mx-auto w-full max-w-[96rem] p-4 sm:p-6 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}

export { DashboardShell };
