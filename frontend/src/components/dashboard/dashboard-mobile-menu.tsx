"use client";

import { Bell, Check, Monitor, Moon, Sun } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useTheme } from "next-themes";
import { useSyncExternalStore } from "react";

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
import type { AppLocale } from "@/i18n/routing";
import { usePreferences } from "@/providers/dashboard/preferences-provider";
import { useNotification } from "@/providers/global/notification-provider";
import type { PreferenceAppearance } from "@/types/dashboard/preferences";

const subscribe = () => () => undefined;
const getClientSnapshot = () => true;
const getServerSnapshot = () => false;

function DashboardMobileMenu() {
  const locale = useLocale() as AppLocale;
  const router = useRouter();
  const t = useTranslations("DashboardShell");
  const languageT = useTranslations("Language");
  const themeT = useTranslations("Theme");
  const preferencesT = useTranslations("Preferences");
  const { notify } = useNotification();
  const { update } = usePreferences();
  const { theme } = useTheme();
  const mounted = useSyncExternalStore(subscribe, getClientSnapshot, getServerSnapshot);
  const selectedTheme: PreferenceAppearance =
    mounted && (theme === "dark" || theme === "light" || theme === "system") ? theme : "system";

  function persist(values: { language?: AppLocale; appearance?: PreferenceAppearance }) {
    void update(values).catch(() => {
      notify({ message: preferencesT("saveError"), tone: "error" });
    });
  }

  const themeOptions = [
    { icon: Monitor, label: themeT("system"), value: "system" },
    { icon: Sun, label: themeT("light"), value: "light" },
    { icon: Moon, label: themeT("dark"), value: "dark" },
  ] as const;

  return (
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger asChild>
        <button aria-label={t("mobileMenu")} className="rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-navy/30" type="button">
          <DashboardAvatar />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64">
        <DropdownMenuItem onSelect={() => router.push("/dashboard/notifications")}>
          <Bell className="size-4" />
          {t("navigation.notifications")}
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuLabel>{languageT("label")}</DropdownMenuLabel>
        {(["en", "sw"] as const).map((value) => (
          <DropdownMenuItem key={value} onSelect={() => persist({ language: value })}>
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
            <DropdownMenuItem key={option.value} onSelect={() => persist({ appearance: option.value })}>
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

export { DashboardMobileMenu };
