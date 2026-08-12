"use client";

import { usePathname } from "next/navigation";
import { useEffect, useMemo, useState, type CSSProperties, type ReactNode } from "react";

import { WorkspaceHeader } from "@/components/workspace/workspace-header";
import { WorkspaceSidebar } from "@/components/workspace/workspace-sidebar";
import { cn } from "@/lib/global/class-names";
import { useWorkspace } from "@/providers/workspace/workspace-provider";

type WorkspaceShellProps = {
  children: ReactNode;
};

function WorkspaceShell({ children }: WorkspaceShellProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [colors, setColors] = useState<{ primary: string; secondary: string } | null>(null);
  const pathname = usePathname();
  const { loadProfile, loadSettings } = useWorkspace();
  const businessId = useMemo(() => pathname.match(/\/workspace\/([^/]+)/)?.[1] ?? null, [pathname]);

  useEffect(() => {
    if (!businessId) return;
    const controller = new AbortController();
    void Promise.all([loadProfile(businessId, controller.signal), loadSettings(businessId, controller.signal)])
      .then(([profile, settings]) => setColors(settings.settings.branding_enabled ? { primary: profile.profile.primary_brand_color, secondary: profile.profile.secondary_brand_color } : null))
      .catch(() => { if (!controller.signal.aborted) setColors(null); });
    return () => controller.abort();
  }, [businessId, loadProfile, loadSettings]);

  const brandStyle = businessId && colors ? ({ "--workspace-primary": colors.primary, "--workspace-secondary": colors.secondary } as CSSProperties) : undefined;

  return (
    <div className="min-h-svh bg-white text-slate-950 dark:bg-slate-950 dark:text-slate-50" style={brandStyle}>
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
