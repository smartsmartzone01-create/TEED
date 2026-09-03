"use client";

import { Building2, Check, ChevronDown } from "lucide-react";
import { useTranslations } from "next-intl";

import { BusinessIcon } from "@/components/workspace/business-icon";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/global/primitives/dropdown-menu";
import { usePathname, useRouter } from "@/i18n/navigation";
import { cn } from "@/lib/global/class-names";
import { useWorkspace } from "@/providers/workspace/workspace-provider";
import { workspaceClassForType } from "@/utils/workspace/workspace-class";

type WorkspaceBusinessMenuProps = {
  showLabel?: boolean;
};

function WorkspaceBusinessMenu({ showLabel = true }: WorkspaceBusinessMenuProps) {
  const router = useRouter();
  const pathname = usePathname();
  const t = useTranslations("WorkspaceShell");
  const directoryT = useTranslations("WorkspaceRefinement.directory");
  const { businesses } = useWorkspace();
  const activeBusinesses = businesses.filter((business) => business.status === "active");
  const activeId = pathname.match(/^\/workspace\/([^/]+)/)?.[1];
  const activeBusiness = activeId
    ? activeBusinesses.find((business) => business.id === activeId)
    : activeBusinesses[0];
  const workspaceName = activeBusiness?.name ?? t("businessFallback");
  const activeClass = activeBusiness
    ? workspaceClassForType(activeBusiness.workspace_type)
    : "business";

  return (
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger asChild>
        <button
          aria-label={t("businessMenu")}
          className={cn(
            "flex min-w-0 items-center rounded-xl text-left transition-colors",
            "hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400/40",
            "dark:hover:bg-slate-900",
            showLabel ? "gap-2 p-1" : "size-8 justify-center rounded-lg p-0",
          )}
          type="button"
        >
          <BusinessIcon
            className={showLabel ? undefined : "size-7 rounded-lg text-[0.6rem]"}
            logoUrl={activeBusiness?.logo_url ?? null}
            name={workspaceName}
            primaryColor={activeBusiness?.primary_brand_color ?? "#0B1F3A"}
            secondaryColor={activeBusiness?.secondary_brand_color ?? "#F97316"}
          />
          {showLabel ? (
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-semibold">{workspaceName}</span>
              <span className="block truncate text-xs text-slate-500 dark:text-slate-400">
                {directoryT(activeClass === "personal" ? "personalClass" : "businessClass")}
              </span>
            </span>
          ) : null}
          {showLabel ? <ChevronDown className="size-4 shrink-0 text-slate-400" /> : null}
        </button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-72">
        <DropdownMenuLabel>{workspaceName}</DropdownMenuLabel>
        <DropdownMenuItem className="justify-between">
          <span className="flex min-w-0 items-center gap-3">
            {activeBusiness ? (
              <BusinessIcon
                className="size-7 rounded-lg text-[0.6rem]"
                logoUrl={activeBusiness.logo_url}
                name={activeBusiness.name}
                primaryColor={activeBusiness.primary_brand_color}
                secondaryColor={activeBusiness.secondary_brand_color}
              />
            ) : (
              <Building2 className="size-4 shrink-0" />
            )}
            <span className="truncate">{workspaceName}</span>
          </span>
          <Check className="size-4 shrink-0" />
        </DropdownMenuItem>

        {activeBusinesses
          .filter((business) => business.id !== activeBusiness?.id)
          .map((business) => (
            <DropdownMenuItem
              key={business.id}
              onSelect={() => router.push(`/workspace/${business.id}`)}
            >
              <BusinessIcon
                className="size-7 rounded-lg text-[0.6rem]"
                logoUrl={business.logo_url}
                name={business.name}
                primaryColor={business.primary_brand_color}
                secondaryColor={business.secondary_brand_color}
              />
              <span className="min-w-0 flex-1 truncate">{business.name}</span>
              <span className="text-[10px] text-slate-400">
                {directoryT(
                  workspaceClassForType(business.workspace_type) === "personal"
                    ? "personalClass"
                    : "businessClass",
                )}
              </span>
            </DropdownMenuItem>
          ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export { WorkspaceBusinessMenu };
