import type { StorefrontLocale, StorefrontMoney } from "@/types/storefront";

const localeMap: Record<StorefrontLocale, string> = {
  en: "en-TZ",
  sw: "sw-TZ",
};

export function formatMoney(value: StorefrontMoney, locale: StorefrontLocale): string {
  const amount = Number(value.amount);

  if (!Number.isFinite(amount)) {
    return `${value.currency} ${value.amount}`;
  }

  return new Intl.NumberFormat(localeMap[locale], {
    style: "currency",
    currency: value.currency,
    currencyDisplay: "code",
    maximumFractionDigits: 0,
  }).format(amount);
}
