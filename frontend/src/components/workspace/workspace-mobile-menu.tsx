"use client";

import { Bell, Building2, Check, LayoutDashboard, Monitor, Moon, Plus, Sun, UserPlus } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useTheme } from "next-themes";
import { useSyncExternalStore } from "react";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/global/primitives/dropdown-menu";
import { usePathname, useRouter } from "@/i18n/navigation";
import type { AppLocale } from "@/i18n/routing";
import { useNotifications } from "@/providers/notifications/notifications-provider";

const subscribe = () => () => undefined;
const getClientSnapshot = () => true;
const getServerSnapshot = () => false;

function WorkspaceMobileMenu() {
  const locale = useLocale() as AppLocale;
  const pathname = usePathname();
  const router = useRouter();
  const t = useTranslations("WorkspaceShell");
  const languageT = useTranslations("Language");
  const themeT = useTranslations("Theme");
  const { unreadCount } = useNotifications();
  const { setTheme, theme } = useTheme();
  const mounted = useSyncExternalStore(subscribe, getClientSnapshot, getServerSnapshot);
  const selectedTheme = mounted && ["system", "light", "dark"].includes(theme ?? "") ? theme : "system";

  const themeOptions = [
    { icon: Monitor, label: themeT("system"), value: "system" },
    { icon: Sun, label: themeT("light"), value: "light" },
    { icon: Moon, label: themeT("dark"), value: "dark" },
  ] as const;

  return (
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger asChild>
        <button
          aria-label={t("businessMenu")}
          className="inline-flex size-10 items-center justify-center rounded-xl bg-slate-900 text-xs font-bold tracking-wide text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400/40 dark:bg-white dark:text-slate-950"
          type="button"
        >
          TW
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-72">
        <DropdownMenuLabel>{t("currentBusiness")}</DropdownMenuLabel>
        <DropdownMenuItem className="justify-between">
          <span className="flex items-center gap-2">
            <Building2 className="size-4" />
            TEED Workspace
          </span>
          <Check className="size-4" />
        </DropdownMenuItem>
        <DropdownMenuItem disabled>
          <Building2 className="size-4" />
          {t("switchAfterIntegration")}
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => router.push("/dashboard/workspaces/create")}>
          <Plus className="size-4" />
          {t("createBusiness")}
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => router.push("/dashboard/workspaces/access")}>
          <UserPlus className="size-4" />
          {t("requestAccess")}
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => router.push("/dashboard")}>
          <LayoutDashboard className="size-4" />
          {t("backToDashboard")}
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={() => router.push("/dashboard/notifications")}>
          <Bell className="size-4" />
          {t("notifications")}
          {unreadCount > 0 ? (
            <span className="ml-auto rounded-full bg-red-500 px-2 py-0.5 text-[10px] font-bold text-white">
              {unreadCount > 99 ? "99+" : unreadCount}
            </span>
          ) : null}
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuLabel>{languageT("label")}</DropdownMenuLabel>
        {(["en", "sw"] as const).map((value) => (
          <DropdownMenuItem
            key={value}
            onSelect={() => router.replace(pathname, { locale: value })}
          >
            <span className="w-5 text-xs font-semibold">{value.toUpperCase()}</span>
            {languageT(value === "en" ? "english" : "swahili")}
            {locale === value ? <Check className="ml-auto size-4" /> : null}
          </DropdownMenuItem>
        ))}
        <DropdownMenuSeparator />
        <DropdownMenuLabel>{themeT("label")}</DropdownMenuLabel>
        {themeOptions.map((option) => {
          const Icon = option.icon;
          return (
            <DropdownMenuItem key={option.value} onSelect={() => setTheme(option.value)}>
              <Icon className="size-4" />
              {option.label}
              {selectedTheme === option.value ? <Check className="ml-auto size-4" /> : null}
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export { WorkspaceMobileMenu };
