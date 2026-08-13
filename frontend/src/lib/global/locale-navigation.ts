import type { AppLocale } from "@/i18n/routing";

const supportedLocales: readonly AppLocale[] = ["en", "sw"];

function replaceDocumentLocale(locale: AppLocale) {
  const segments = window.location.pathname.split("/");

  if (supportedLocales.includes(segments[1] as AppLocale)) {
    segments[1] = locale;
  } else {
    segments.splice(1, 0, locale);
  }

  const pathname = segments.join("/") || `/${locale}`;
  window.location.replace(`${pathname}${window.location.search}${window.location.hash}`);
}

export { replaceDocumentLocale };
