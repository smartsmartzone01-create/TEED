"use client";

import { Building2, Check, ChevronDown, LayoutDashboard } from "lucide-react";
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
import { cn } from "@/lib/global/class-names";

type WorkspaceBusinessMenuProps = {
  compact?: boolean;
  placement?: "header" | "sidebar";
};

const previewBusiness = {
  initials: "TW",
  name: "TEED Workspace",
};

function WorkspaceBusinessMenu({
  compact = false,
  placement = "sidebar",
}: WorkspaceBusinessMenuProps) {
  const router = useRouter();
  const t = useTranslations("WorkspaceShell");

  return (
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger asChild>
        <button
          aria-label={t("businessMenu")}
          className={cn(
            "flex min-w-0 items-center rounded-xl text-left transition-colors",
            "hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400/40",
            "dark:hover:bg-slate-900",
            placement === "header" ? "gap-2 p-1" : "w-full gap-3 p-1.5",
            compact && "justify-center",
          )}
          type="button"
        >
          <span className="inline-flex size-10 shrink-0 items-center justify-center rounded-xl bg-slate-900 text-xs font-bold tracking-wide text-white dark:bg-white dark:text-slate-950">
            {previewBusiness.initials}
          </span>
          {!compact && placement === "sidebar" ? (
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-semibold">
                {previewBusiness.name}
              </span>
              <span className="block truncate text-xs text-slate-500 dark:text-slate-400">
                {t("previewState")}
              </span>
            </span>
          ) : null}
          {!compact ? <ChevronDown className="size-4 shrink-0 text-slate-400" /> : null}
        </button>
      </DropdownMenuTrigger>

      <DropdownMenuContent
        align={placement === "header" ? "end" : "start"}
        className="w-72"
        side={placement === "sidebar" ? "top" : "bottom"}
      >
        <DropdownMenuLabel>{t("currentBusiness")}</DropdownMenuLabel>
        <DropdownMenuItem className="justify-between">
          <span className="flex min-w-0 items-center gap-3">
            <Building2 className="size-4 shrink-0" />
            <span className="truncate">{previewBusiness.name}</span>
          </span>
          <Check className="size-4 shrink-0" />
        </DropdownMenuItem>
        <DropdownMenuItem disabled>
          <Building2 className="size-4" />
          {t("switchAfterIntegration")}
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
