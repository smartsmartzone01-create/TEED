"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { Menu, X } from "lucide-react";
import { useTranslations } from "next-intl";

import { TunakuzaWordmark } from "@/components/global/brand/tunakuza-wordmark";
import { LanguageSwitcher } from "@/components/global/controls/language-switcher";
import { ThemeSwitcher } from "@/components/global/controls/theme-switcher";
import {
  Button,
  buttonVariants,
} from "@/components/global/primitives/button";
import { MarketingMegaMenu } from "@/components/marketing/marketing-mega-menu";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/global/class-names";

function MarketingHeader() {
  const t = useTranslations("MarketingHeader");
  const languageT = useTranslations("Language");
  const themeT = useTranslations("Theme");

  const desktopDirectItems = [
    {
      href: "#how-it-works",
      label: t("howItWorks"),
    },
    {
      href: "#solutions",
      label: t("solutions"),
    },
    {
      href: "#pricing",
      label: t("pricing"),
    },
  ] as const;

  const mobileNavigationItems = [
    {
      href: "#features",
      label: t("features"),
    },
    ...desktopDirectItems,
  ] as const;

  return (
    <header className="relative z-40 border-b border-border/40 bg-background/25 backdrop-blur-lg">
      <div className="page-container relative flex h-20 items-center justify-between">
        <TunakuzaWordmark className="text-3xl" />

        <nav
          aria-label={t("primaryNavigation")}
          className="hidden items-center gap-8 lg:flex"
        >
          <MarketingMegaMenu
            label={t("features")}
            openLabel={t("openMenu", {
              menu: t("features"),
            })}
            closeLabel={t("closeMenu", {
              menu: t("features"),
            })}
          >
            <div className="grid min-h-56 grid-cols-4 divide-x divide-border/70 p-6">
              <div className="px-5 first:pl-0">
                <h2 className="text-sm font-semibold text-foreground">
                  {t(
                    "featuresMenu.businessOperations.title",
                  )}
                </h2>
              </div>

              <div className="px-5">
                <h2 className="text-sm font-semibold text-foreground">
                  {t("featuresMenu.marketing.title")}
                </h2>
              </div>

              <div className="px-5">
                <h2 className="text-sm font-semibold text-foreground">
                  {t("featuresMenu.insightsAi.title")}
                </h2>
              </div>

              <div className="px-5 last:pr-0">
                <h2 className="text-sm font-semibold text-foreground">
                  {t("featuresMenu.digitalGrowth.title")}
                </h2>
              </div>
            </div>
          </MarketingMegaMenu>

          {desktopDirectItems.map((item) => (
            <Link
              className="text-sm font-medium text-foreground/70 transition-colors hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
              href={item.href}
              key={item.href}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="hidden items-center gap-2 lg:flex">
          <LanguageSwitcher />
          <ThemeSwitcher />

          <Button asChild variant="ghost">
            <Link href="/login">{t("logIn")}</Link>
          </Button>

          <Button asChild>
            <Link href="/register">{t("getStarted")}</Link>
          </Button>
        </div>

        <Dialog.Root>
          <Dialog.Trigger asChild>
            <Button
              aria-label={t("openNavigation")}
              className="lg:hidden"
              size="icon"
              variant="ghost"
            >
              <Menu aria-hidden="true" />
            </Button>
          </Dialog.Trigger>

          <Dialog.Portal>
            <Dialog.Overlay className="fixed inset-0 z-50 bg-brand-navy/20 backdrop-blur-sm" />

            <Dialog.Content className="fixed inset-y-0 right-0 z-60 flex w-[min(22rem,88vw)] flex-col bg-background p-6 shadow-2xl outline-none">
              <Dialog.Title className="sr-only">
                {t("primaryNavigation")}
              </Dialog.Title>

              <Dialog.Description className="sr-only">
                {t("navigationDescription")}
              </Dialog.Description>

              <div className="flex items-center justify-between">
                <TunakuzaWordmark className="text-3xl" />

                <Dialog.Close asChild>
                  <Button
                    aria-label={t("closeNavigation")}
                    size="icon"
                    variant="ghost"
                  >
                    <X aria-hidden="true" />
                  </Button>
                </Dialog.Close>
              </div>

              <nav
                aria-label={t("mobileNavigation")}
                className="mt-10 flex flex-col"
              >
                {mobileNavigationItems.map((item) => (
                  <Dialog.Close
                    asChild
                    key={item.href}
                  >
                    <Link
                      className="border-b border-border py-4 text-lg font-medium text-foreground transition-colors hover:text-primary"
                      href={item.href}
                    >
                      {item.label}
                    </Link>
                  </Dialog.Close>
                ))}
              </nav>

              <div className="mt-6 divide-y divide-border rounded-xl border border-border bg-background/60">
                <div className="flex items-center justify-between gap-4 p-3">
                  <span className="text-sm font-medium text-foreground/70">
                    {languageT("label")}
                  </span>

                  <LanguageSwitcher
                    contentClassName="z-[70]"
                    showTooltip={false}
                  />
                </div>

                <div className="flex items-center justify-between gap-4 p-3">
                  <span className="text-sm font-medium text-foreground/70">
                    {themeT("label")}
                  </span>

                  <ThemeSwitcher
                    contentClassName="z-[70]"
                    showTooltip={false}
                  />
                </div>
              </div>

              <div className="mt-auto grid gap-3 pt-8">
                <Dialog.Close asChild>
                  <Link
                    className={cn(
                      buttonVariants({
                        size: "large",
                        variant: "outline",
                      }),
                      "w-full",
                    )}
                    href="/login"
                  >
                    {t("logIn")}
                  </Link>
                </Dialog.Close>

                <Dialog.Close asChild>
                  <Link
                    className={cn(
                      buttonVariants({
                        size: "large",
                        variant: "default",
                      }),
                      "w-full",
                    )}
                    href="/register"
                  >
                    {t("getStarted")}
                  </Link>
                </Dialog.Close>
              </div>
            </Dialog.Content>
          </Dialog.Portal>
        </Dialog.Root>
      </div>
    </header>
  );
}

export { MarketingHeader };
