"use client";

import {
  CircleHelp,
  CreditCard,
  LogOut,
  Settings2,
  UserRound,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";

import { DashboardAvatar } from "@/components/dashboard/dashboard-avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/global/primitives/dropdown-menu";
import { useRouter } from "@/i18n/navigation";
import { useNotification } from "@/providers/global/notification-provider";
import { useIdentitySession } from "@/providers/identity/identity-session-provider";
import { logoutCurrentSession } from "@/services/identity/entry";

type DashboardAccountMenuProps = {
  align?: "end" | "start";
  compact?: boolean;
};

function DashboardAccountMenu({
  align = "start",
  compact = false,
}: DashboardAccountMenuProps) {
  const t = useTranslations("DashboardShell");
  const errorsT = useTranslations("IdentityErrors");
  const router = useRouter();
  const { notify } = useNotification();
  const { clearSession, user } = useIdentitySession();
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const accountIdentifier = user?.email || user?.phoneNumber || t("account");

  async function handleLogout() {
    setIsLoggingOut(true);
    try {
      await logoutCurrentSession();
      clearSession();
      router.replace("/login");
    } catch {
      notify({ message: errorsT("logout_failed"), tone: "error" });
      setIsLoggingOut(false);
    }
  }

  return (
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger asChild>
        <button
          aria-label={t("accountMenu")}
          className={[
            "flex min-w-0 items-center rounded-xl p-1.5 text-left",
            "transition-colors hover:bg-foreground/5",
            "focus-visible:outline-none focus-visible:ring-2",
            "focus-visible:ring-foreground/30",
            compact ? "justify-center" : "w-full gap-3",
          ].join(" ")}
          type="button"
        >
          <DashboardAvatar />
          {!compact ? (
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-semibold">
                {user?.username || t("account")}
              </span>
              <span className="block truncate text-xs text-muted-foreground">
                {accountIdentifier}
              </span>
            </span>
          ) : null}
        </button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align={align} className="w-64">
        <DropdownMenuLabel>{accountIdentifier}</DropdownMenuLabel>
        <DropdownMenuItem onSelect={() => router.push("/dashboard/profile")}>
          <UserRound className="size-4" />
          {t("navigation.profile")}
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => router.push("/dashboard/preferences")}>
          <Settings2 className="size-4" />
          {t("navigation.preferences")}
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={() => router.push("/dashboard/billing")}>
          <CreditCard className="size-4" />
          {t("navigation.billing")}
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => router.push("/dashboard/help")}>
          <CircleHelp className="size-4" />
          {t("navigation.help")}
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          className="text-red-600 data-highlighted:bg-red-50 data-highlighted:text-red-700 dark:text-red-300 dark:data-highlighted:bg-red-950/40"
          disabled={isLoggingOut}
          onSelect={handleLogout}
        >
          <LogOut className="size-4" />
          {isLoggingOut ? t("loggingOut") : t("logout")}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export { DashboardAccountMenu };
