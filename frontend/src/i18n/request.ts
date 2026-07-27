import { hasLocale } from "next-intl";
import { getRequestConfig } from "next-intl/server";

import { routing } from "@/i18n/routing";

export default getRequestConfig(async ({ requestLocale }) => {
  const requestedLocale = await requestLocale;

  const locale = hasLocale(
    routing.locales,
    requestedLocale,
  )
    ? requestedLocale
    : routing.defaultLocale;

  const [globalMessages, marketingMessages] =
    await Promise.all([
      import(`@/i18n/messages/global/${locale}.json`),
      import(`@/i18n/messages/marketing/${locale}.json`),
    ]);

  return {
    locale,
    messages: {
      ...globalMessages.default,
      ...marketingMessages.default,
    },
  };
});