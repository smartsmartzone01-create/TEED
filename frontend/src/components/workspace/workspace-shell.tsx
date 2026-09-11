"use client";

import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from "react";

import { WorkspaceSearchBar } from "@/components/global/search/workspace-search-bar";
import { KuzaAICompanion } from "@/components/intelligence/kuza-ai-companion";
import { WorkspaceHeader } from "@/components/workspace/workspace-header";
import { WorkspaceSidebar } from "@/components/workspace/workspace-sidebar";
import { useRouter } from "@/i18n/navigation";
import { cn } from "@/lib/global/class-names";
import { useNotification } from "@/providers/global/notification-provider";
import { useWorkspace } from "@/providers/workspace/workspace-provider";
import type { KuzaAIMode } from "@/types/intelligence/kuza-ai";

type WorkspaceShellProps = {
  children: ReactNode;
};

type WorkspaceContentProps = {
  businessId: string | null;
  children: ReactNode;
  hasSearchBar: boolean;
  kuzaAIAvailable: boolean;
};

function WorkspaceContent({
  businessId,
  children,
  hasSearchBar,
  kuzaAIAvailable,
}: WorkspaceContentProps) {
  const [kuzaAIMode, setKuzaAIMode] = useState<KuzaAIMode>("closed");

  return (
    <div
      className={cn(
        "flex w-full min-w-0 max-w-full",
        hasSearchBar
          ? "min-h-[calc(100svh-6.5rem)]"
          : "min-h-[calc(100svh-3.5rem)]",
      )}
    >
      <main
        className={cn(
          "w-full min-w-0 max-w-full flex-1",
          kuzaAIAvailable && kuzaAIMode === "expanded" ? "lg:hidden" : "block",
        )}
      >
        <div className="mx-auto w-full min-w-0 max-w-384 p-4 sm:p-6 lg:p-8">
          {children}
        </div>
      </main>
      {kuzaAIAvailable && businessId ? (
        <KuzaAICompanion
          businessId={businessId}
          mode={kuzaAIMode}
          onModeChange={setKuzaAIMode}
        />
      ) : null}
    </div>
  );
}

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
      if (currentBusiness.status !== "active") {
        router.replace(`/dashboard/workspaces/${businessId}/lifecycle`);
        return;
      }
      knownBusiness.current = businessId;
      return;
    }
    notify({
      message: t(knownBusiness.current === businessId ? "accessEnded" : "workspaceUnavailable"),
      tone: "info",
    });
    knownBusiness.current = null;
    router.replace("/workspaces");
  }, [businessId, currentBusiness, notify, router, status, t]);

  useEffect(() => {
    if (!businessId || currentBusiness?.status !== "active") return;
    const controller = new AbortController();
    void Promise.all([loadProfile(businessId, controller.signal), loadSettings(businessId, controller.signal)])
      .then(([profile, settings]) => setColors(settings.settings.branding_enabled ? { primary: profile.profile.primary_brand_color, secondary: profile.profile.secondary_brand_color } : null))
      .catch(() => { if (!controller.signal.aborted) setColors(null); });
    return () => controller.abort();
  }, [businessId, currentBusiness?.status, loadProfile, loadSettings]);

  useEffect(() => {
    if (!businessId) return;
    if (pathname.startsWith(`/workspace/${businessId}/commerce`)) {
      window.localStorage.setItem(`tunakuza:workspace:${businessId}:started`, "1");
    }
  }, [businessId, pathname]);

  const brandStyle = businessId && colors ? ({ "--workspace-primary": colors.primary, "--workspace-secondary": colors.secondary } as CSSProperties) : undefined;
  const kuzaAIAvailable = Boolean(
    businessId && currentBusiness?.status === "active",
  );
  const searchAvailable = Boolean(
    businessId &&
      currentBusiness?.status === "active" &&
      currentBusiness.capabilities.includes("business_operations") &&
      currentBusiness.membership.permissions.includes("commerce.view"),
  );

  return (
    <div
      className="min-h-svh w-full min-w-0 max-w-full bg-white text-slate-950 dark:bg-slate-950 dark:text-slate-50"
      data-workspace-shell
      style={brandStyle}
    >
      <WorkspaceSidebar
        collapsed={collapsed}
        mobileOpen={mobileOpen}
        onCloseMobile={() => setMobileOpen(false)}
        onToggleCollapsed={() => setCollapsed((value) => !value)}
      />
      <div
        className={cn(
          "min-h-svh w-full min-w-0 max-w-full transition-[padding] duration-300 ease-out",
          collapsed ? "lg:pl-21" : "lg:pl-64",
        )}
      >
        <WorkspaceHeader businessId={businessId} onOpenNavigation={() => setMobileOpen(true)} />
        {searchAvailable && businessId ? (
          <WorkspaceSearchBar businessId={businessId} />
        ) : null}
        <div
          className={cn(
            "w-full min-w-0 max-w-full bg-[#F4F7FA] dark:bg-slate-950",
            searchAvailable
              ? "min-h-[calc(100svh-6.5rem)]"
              : "min-h-[calc(100svh-3.5rem)]",
          )}
        >
          <WorkspaceContent
            businessId={businessId}
            hasSearchBar={searchAvailable}
            key={businessId ?? "workspace-without-business"}
            kuzaAIAvailable={kuzaAIAvailable}
          >
            {children}
          </WorkspaceContent>
        </div>
      </div>
    </div>
  );
}

export { WorkspaceShell };
