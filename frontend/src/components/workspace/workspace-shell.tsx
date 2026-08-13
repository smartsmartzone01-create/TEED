"use client";

import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from "react";

import { WorkspaceHeader } from "@/components/workspace/workspace-header";
import { BusinessLifecycleState } from "@/components/workspace/business-lifecycle-state";
import { WorkspaceSidebar } from "@/components/workspace/workspace-sidebar";
import { cn } from "@/lib/global/class-names";
import { useRouter } from "@/i18n/navigation";
import { useWorkspace } from "@/providers/workspace/workspace-provider";
import { useNotification } from "@/providers/global/notification-provider";

type WorkspaceShellProps = {
  children: ReactNode;
};

function WorkspaceShell({ children }: WorkspaceShellProps) {
  const t = useTranslations("WorkspaceShell");
  const { notify } = useNotification();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [colors, setColors] = useState<{ primary: string; secondary: string } | null>(null);
  const pathname = usePathname();
  const router = useRouter();
  const { businesses, loadProfile, loadSettings, status } = useWorkspace();
  const businessId = useMemo(() => pathname.match(/\/workspace\/([^/]+)/)?.[1] ?? null, [pathname]);
  const knownBusiness = useRef<string | null>(null);
  const currentBusiness = businessId
    ? businesses.find((business) => business.id === businessId)
    : undefined;

  useEffect(() => {
    if (!businessId || status !== "ready") return;
    if (currentBusiness) {
      knownBusiness.current = businessId;
      return;
    }
    notify({
      message: t(knownBusiness.current === businessId ? "accessEnded" : "workspaceUnavailable"),
      tone: "info",
    });
    knownBusiness.current = null;
    router.replace(businesses[0] ? `/workspace/${businesses[0].id}` : "/dashboard/workspaces");
  }, [businessId, businesses, currentBusiness, notify, router, status, t]);

  useEffect(() => {
    if (!businessId || currentBusiness?.status !== "active") return;
    const controller = new AbortController();
    void Promise.all([loadProfile(businessId, controller.signal), loadSettings(businessId, controller.signal)])
      .then(([profile, settings]) => setColors(settings.settings.branding_enabled ? { primary: profile.profile.primary_brand_color, secondary: profile.profile.secondary_brand_color } : null))
      .catch(() => { if (!controller.signal.aborted) setColors(null); });
    return () => controller.abort();
  }, [businessId, currentBusiness?.status, loadProfile, loadSettings]);

  if (currentBusiness && currentBusiness.status !== "active") {
    return <BusinessLifecycleState business={currentBusiness} />;
  }

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
        <WorkspaceHeader businessId={businessId} onOpenNavigation={() => setMobileOpen(true)} />
        <main className="mx-auto w-full max-w-[96rem] p-4 sm:p-6 lg:p-8">{children}</main>
      </div>
    </div>
  );
}

export { WorkspaceShell };
