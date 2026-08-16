import { hasLocale } from "next-intl";
import { getRequestConfig } from "next-intl/server";

import { routing } from "@/i18n/routing";

export default getRequestConfig(async ({ requestLocale }) => {
  const requestedLocale = await requestLocale;

  const locale = hasLocale(routing.locales, requestedLocale)
    ? requestedLocale
    : routing.defaultLocale;

  const [
    dashboardMessages,
    globalMessages,
    identityMessages,
    marketingMessages,
    preferencesMessages,
    profileMessages,
    securityMessages,
    notificationMessages,
    workspaceMessages,
    commerceMessages,
    commerceStockMessages,
    commerceSalesMessages,
  ] = await Promise.all([
    import(`@/i18n/messages/dashboard/${locale}.json`),
    import(`@/i18n/messages/global/${locale}.json`),
    import(`@/i18n/messages/identity/${locale}.json`),
    import(`@/i18n/messages/marketing/${locale}.json`),
    import(`@/i18n/messages/preferences/${locale}.json`),
    import(`@/i18n/messages/profile/${locale}.json`),
    import(`@/i18n/messages/security/${locale}.json`),
    import(`@/i18n/messages/notifications/${locale}.json`),
    import(`@/i18n/messages/workspace/${locale}.json`),
    import(`@/i18n/messages/commerce/${locale}.json`),
    import(`@/i18n/messages/commerce-stock/${locale}.json`),
    import(`@/i18n/messages/commerce-sales/${locale}.json`),
  ]);

  return {
    locale,
    messages: {
      ...dashboardMessages.default,
      ...globalMessages.default,
      ...identityMessages.default,
      ...marketingMessages.default,
      ...preferencesMessages.default,
      ...profileMessages.default,
      ...securityMessages.default,
      ...notificationMessages.default,
      ...workspaceMessages.default,
      ...commerceMessages.default,
      ...commerceStockMessages.default,
      ...commerceSalesMessages.default,
    },
  };
});
