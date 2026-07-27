"use client";

import { Globe2 } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useTransition } from "react";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/global/primitives/dropdown-menu";
import { Tooltip } from "@/components/global/primitives/tooltip";
import {
  usePathname,
  useRouter,
} from "@/i18n/navigation";
import type { AppLocale } from "@/i18n/routing";

type LanguageSwitcherProps = {
  contentClassName?: string;
  showTooltip?: boolean;
};

function LanguageSwitcher({
  contentClassName,
  showTooltip = true,
}: LanguageSwitcherProps) {
  const locale = useLocale() as AppLocale;
  const pathname = usePathname();
  const router = useRouter();
  const t = useTranslations("Language");
  const [isPending, startTransition] = useTransition();

  function changeLocale(nextLocale: string) {
    const selectedLocale = nextLocale as AppLocale;

    if (selectedLocale === locale) {
      return;
    }

    startTransition(() => {
      router.replace(pathname, {
        locale: selectedLocale,
      });
    });
  }

  return (
    <DropdownMenu modal={false}>
      <Tooltip
        content={t("label")}
        disabled={!showTooltip}
      >
        <DropdownMenuTrigger asChild>
          <button
            aria-busy={isPending}
            aria-label={t("label")}
            className={[
              "inline-flex size-10 items-center justify-center rounded-full",
              "border border-brand-navy/15 bg-background/60",
              "text-brand-navy shadow-sm backdrop-blur-md",
              "transition-colors",
              "hover:border-brand-orange/40 hover:bg-brand-orange/10",
              "focus-visible:outline-none focus-visible:ring-2",
              "focus-visible:ring-brand-navy focus-visible:ring-offset-2",
              "data-[state=open]:border-brand-orange/50",
              "data-[state=open]:bg-brand-orange/15",
              isPending ? "cursor-wait opacity-60" : "",
            ].join(" ")}
            disabled={isPending}
            type="button"
          >
            <Globe2 aria-hidden="true" className="size-4.5" />
          </button>
        </DropdownMenuTrigger>
      </Tooltip>

      <DropdownMenuContent
        align="end"
        className={contentClassName}
      >
        <DropdownMenuLabel>{t("label")}</DropdownMenuLabel>

        <DropdownMenuRadioGroup
          onValueChange={changeLocale}
          value={locale}
        >
          <DropdownMenuRadioItem
            disabled={isPending}
            value="en"
          >
            <span className="flex flex-1 items-center justify-between gap-5">
              <span>{t("english")}</span>

              <span className="text-xs font-semibold text-muted-foreground">
                EN
              </span>
            </span>
          </DropdownMenuRadioItem>

          <DropdownMenuRadioItem
            disabled={isPending}
            value="sw"
          >
            <span className="flex flex-1 items-center justify-between gap-5">
              <span>{t("swahili")}</span>

              <span className="text-xs font-semibold text-muted-foreground">
                SW
              </span>
            </span>
          </DropdownMenuRadioItem>
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export { LanguageSwitcher };