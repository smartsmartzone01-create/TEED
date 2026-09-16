import type { LocalizedText, StorefrontLocale } from "@/types/storefront";

export function localized(value: LocalizedText, locale: StorefrontLocale): string {
  return value[locale]?.trim() || value.en?.trim() || value.sw?.trim() || "";
}
