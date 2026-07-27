import { defineRouting } from "next-intl/routing";

export const routing = defineRouting({
  locales: ["en", "sw"],
  defaultLocale: "en",
  localePrefix: "as-needed",
  localeDetection: true,
  localeCookie: {
    name: "TEED_LOCALE",
    maxAge: 60 * 60 * 24 * 365,
  },
});

export type AppLocale = (typeof routing.locales)[number];