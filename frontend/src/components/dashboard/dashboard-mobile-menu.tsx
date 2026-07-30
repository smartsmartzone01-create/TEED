"use client";

import { Bell, Check, Monitor, Moon, Sun } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useTheme } from "next-themes";
import { useSyncExternalStore, useTransition } from "react";

import { DashboardAvatar } from "@/components/dashboard/dashboard-avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/global/primitives/dropdown-menu";
import {
  usePathname,
  useRouter,
} from "@/i18n/navigation";
import type { AppLocale } from "@/i18n/routing";

type ThemeValue = "dark" | "light" | "system";

const subscribe = () => () => undefined;
const getClientSnapshot = () => true;
const getServerSnapshot = () => false;

function DashboardMobileMenu() {
  const locale = useLocale() as AppLocale;
  const pathname = usePathname();
  const router = useRouter();
  const t = useTranslations("DashboardShell");
  const languageT = useTranslations("Language");
  const themeT = useTranslations("Theme");
  const { setTheme, theme } = useTheme();
  const [isPending, startTransition] = useTransition();
  const mounted = useSyncExternalStore(
    subscribe,
    getClientSnapshot,
    getServerSnapshot,
  );
  const selectedTheme =
    mounted &&
    (theme === "dark" || theme === "light" || theme === "system")
      ? theme
      : "system";

  function changeLocale(nextLocale: AppLocale) {
    if (nextLocale === locale) {
      return;
    }

    startTransition(() => {
      router.replace(pathname, { locale: nextLocale });
    });
  }

  const themeOptions: {
    icon: typeof Monitor;
    label: string;
    value: ThemeValue;
  }[] = [
    { icon: Monitor, label: themeT("system"), value: "system" },
    { icon: Sun, label: themeT("light"), value: "light" },
    { icon: Moon, label: themeT("dark"), value: "dark" },
  ];

  return (
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger asChild>
        <button
          aria-label={t("mobileMenu")}
          className="rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-navy/30"
          type="button"
        >
          <DashboardAvatar />
        </button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-64">
        <DropdownMenuItem
          onSelect={() => router.push("/dashboard/notifications")}
        >
          <Bell className="size-4" />
          {t("navigation.notifications")}
        </DropdownMenuItem>

        <DropdownMenuSeparator />
        <DropdownMenuLabel>{languageT("label")}</DropdownMenuLabel>
        <DropdownMenuItem
          disabled={isPending}
          onSelect={() => changeLocale("en")}
        >
          <span className="w-5 text-xs font-semibold">EN</span>
          {languageT("english")}
          {locale === "en" ? <Check className="ml-auto size-4" /> : null}
        </DropdownMenuItem>
        <DropdownMenuItem
          disabled={isPending}
          onSelect={() => changeLocale("sw")}
        >
          <span className="w-5 text-xs font-semibold">SW</span>
          {languageT("swahili")}
          {locale === "sw" ? <Check className="ml-auto size-4" /> : null}
        </DropdownMenuItem>

        <DropdownMenuSeparator />
        <DropdownMenuLabel>{themeT("label")}</DropdownMenuLabel>
        {themeOptions.map((option) => {
          const Icon = option.icon;

          return (
            <DropdownMenuItem
              key={option.value}
              onSelect={() => setTheme(option.value)}
            >
              <Icon className="size-4" />
              {option.label}
              {selectedTheme === option.value ? (
                <Check className="ml-auto size-4" />
              ) : null}
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export { DashboardMobileMenu };
