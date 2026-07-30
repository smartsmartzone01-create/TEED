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

  const [
    dashboardMessages,
    globalMessages,
    identityMessages,
    marketingMessages,
  ] = await Promise.all([
    import(`@/i18n/messages/dashboard/${locale}.json`),
    import(`@/i18n/messages/global/${locale}.json`),
    import(`@/i18n/messages/identity/${locale}.json`),
    import(`@/i18n/messages/marketing/${locale}.json`),
  ]);

  return {
    locale,
    messages: {
      ...dashboardMessages.default,
      ...globalMessages.default,
      ...identityMessages.default,
      ...marketingMessages.default,
    },
  };
});
