"use client";

import { Building2, Check, ChevronDown, LayoutDashboard, Plus, UserPlus } from "lucide-react";
import { useTranslations } from "next-intl";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/global/primitives/dropdown-menu";
import { useRouter } from "@/i18n/navigation";
import { usePathname } from "@/i18n/navigation";
import { cn } from "@/lib/global/class-names";
import { useWorkspace } from "@/providers/workspace/workspace-provider";

type WorkspaceBusinessMenuProps = {
  showLabel?: boolean;
};

function getBusinessInitials(name: string) {
  const words = name.trim().split(/\s+/).filter(Boolean);
  return (words.length > 1 ? `${words[0][0]}${words[1][0]}` : name.slice(0, 2)).toUpperCase();
}

function WorkspaceBusinessMenu({ showLabel = true }: WorkspaceBusinessMenuProps) {
  const router = useRouter();
  const pathname = usePathname();
  const t = useTranslations("WorkspaceShell");
  const { businesses } = useWorkspace();
  const activeId = pathname.match(/^\/workspace\/([^/]+)/)?.[1];
  const activeBusiness = businesses.find((business) => business.id === activeId) ?? businesses[0];
  const businessName = activeBusiness?.name ?? t("businessFallback");

  return (
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger asChild>
        <button
          aria-label={t("businessMenu")}
          className={cn(
            "flex min-w-0 items-center rounded-xl text-left transition-colors",
            "hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400/40",
            "dark:hover:bg-slate-900",
            "gap-2 p-1",
          )}
          type="button"
        >
          <span className="inline-flex size-10 shrink-0 items-center justify-center rounded-xl bg-slate-900 text-xs font-bold tracking-wide text-white dark:bg-white dark:text-slate-950">
            {getBusinessInitials(businessName)}
          </span>
          {showLabel ? (
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-semibold">
                {businessName}
              </span>
              <span className="block truncate text-xs text-slate-500 dark:text-slate-400">
                {t("previewState")}
              </span>
            </span>
          ) : null}
          {showLabel ? <ChevronDown className="size-4 shrink-0 text-slate-400" /> : null}
        </button>
      </DropdownMenuTrigger>

      <DropdownMenuContent
        align="end"
        className="w-72"
      >
        <DropdownMenuLabel>{t("currentBusiness")}</DropdownMenuLabel>
        <DropdownMenuItem className="justify-between">
          <span className="flex min-w-0 items-center gap-3">
            <Building2 className="size-4 shrink-0" />
            <span className="truncate">{businessName}</span>
          </span>
          <Check className="size-4 shrink-0" />
        </DropdownMenuItem>
        {businesses.filter((business) => business.id !== activeBusiness?.id).map((business) => (
          <DropdownMenuItem key={business.id} onSelect={() => router.push(`/workspace/${business.id}`)}>
            <Building2 className="size-4" />
            <span className="truncate">{business.name}</span>
          </DropdownMenuItem>
        ))}
        {businesses.length < 2 ? <DropdownMenuItem disabled>{t("noOtherBusinesses")}</DropdownMenuItem> : null}
        <DropdownMenuItem onSelect={() => router.push("/dashboard/workspaces/create")}>
          <Plus className="size-4" />
          {t("createBusiness")}
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => router.push("/dashboard/workspaces/access")}>
          <UserPlus className="size-4" />
          {t("requestAccess")}
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={() => router.push("/dashboard")}>
          <LayoutDashboard className="size-4" />
          {t("backToDashboard")}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export { WorkspaceBusinessMenu };
