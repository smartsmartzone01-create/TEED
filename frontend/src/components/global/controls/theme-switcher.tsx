"use client";

import { Monitor, Moon, Sun } from "lucide-react";
import { useTranslations } from "next-intl";
import { useTheme } from "next-themes";
import { useSyncExternalStore } from "react";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/global/primitives/dropdown-menu";
import { Tooltip } from "@/components/global/primitives/tooltip";
import { useOptionalPreferences } from "@/providers/dashboard/preferences-provider";
import { useNotification } from "@/providers/global/notification-provider";
import type { PreferenceAppearance } from "@/types/dashboard/preferences";

type ThemeSwitcherProps = {
  contentClassName?: string;
  showTooltip?: boolean;
};

const subscribe = () => () => undefined;
const getClientSnapshot = () => true;
const getServerSnapshot = () => false;

function isThemeValue(value: string | undefined): value is PreferenceAppearance {
  return value === "system" || value === "light" || value === "dark";
}

function ThemeSwitcher({ contentClassName, showTooltip = true }: ThemeSwitcherProps) {
  const t = useTranslations("Theme");
  const preferencesT = useTranslations("Preferences");
  const preferences = useOptionalPreferences();
  const { notify } = useNotification();
  const { resolvedTheme, setTheme, theme } = useTheme();
  const mounted = useSyncExternalStore(subscribe, getClientSnapshot, getServerSnapshot);
  const selectedTheme = mounted && isThemeValue(theme) ? theme : "system";
  const TriggerIcon = !mounted || selectedTheme === "system" ? Monitor : resolvedTheme === "dark" ? Moon : Sun;
  const options = [
    { icon: Monitor, label: t("system"), value: "system" },
    { icon: Sun, label: t("light"), value: "light" },
    { icon: Moon, label: t("dark"), value: "dark" },
  ] as const;

  function changeTheme(nextTheme: string) {
    if (!isThemeValue(nextTheme)) return;
    if (preferences) {
      void preferences.update({ appearance: nextTheme }).catch(() => {
        notify({ message: preferencesT("saveError"), tone: "error" });
      });
      return;
    }
    setTheme(nextTheme);
  }

  return (
    <DropdownMenu modal={false}>
      <Tooltip content={t("label")} disabled={!showTooltip}>
        <DropdownMenuTrigger asChild>
          <button
            aria-label={t("label")}
            className="inline-flex size-10 items-center justify-center rounded-full border border-brand-navy/15 bg-background/60 text-brand-navy shadow-sm backdrop-blur-md transition-colors hover:border-brand-orange/40 hover:bg-brand-orange/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-navy focus-visible:ring-offset-2 disabled:cursor-wait disabled:opacity-60"
            disabled={!mounted}
            type="button"
          >
            <TriggerIcon aria-hidden="true" className="size-4.5" />
          </button>
        </DropdownMenuTrigger>
      </Tooltip>
      <DropdownMenuContent align="end" className={contentClassName}>
        <DropdownMenuLabel>{t("label")}</DropdownMenuLabel>
        <DropdownMenuRadioGroup onValueChange={changeTheme} value={selectedTheme}>
          {options.map((option) => {
            const Icon = option.icon;
            return (
              <DropdownMenuRadioItem key={option.value} value={option.value}>
                <Icon aria-hidden="true" className="size-4 shrink-0 text-brand-orange" />
                <span className="flex-1">{option.label}</span>
              </DropdownMenuRadioItem>
            );
          })}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export { ThemeSwitcher };
