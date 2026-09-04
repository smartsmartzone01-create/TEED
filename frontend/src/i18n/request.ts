import { hasLocale } from "next-intl";
import { getRequestConfig } from "next-intl/server";

import { routing } from "@/i18n/routing";
import { frontendBrandText } from "@/utils/global/product-brand";

function frontendTerminologyText(value: string) {
  return value
    .replace(/Available Items/g, "Available Products")
    .replace(/Available items/g, "Available Products")
    .replace(/available items/g, "available products");
}

function brandFrontendMessages<T>(value: T): T {
  if (typeof value === "string") {
    return frontendTerminologyText(frontendBrandText(value)) as T;
  }
  if (Array.isArray(value)) {
    return value.map((item) => brandFrontendMessages(item)) as T;
  }
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([key, item]) => [key, brandFrontendMessages(item)]),
    ) as T;
  }
  return value;
}

function withCommerceStockReceiptFallback<T extends Record<string, unknown>>(
  messages: T,
): T {
  const commerceStock = messages.CommerceStock;
  if (!commerceStock || typeof commerceStock !== "object") return messages;

  const stockMessages = commerceStock as Record<string, unknown>;
  const receipt = stockMessages.receipt;
  const costMode = stockMessages.costMode;
  if (!receipt || typeof receipt !== "object") return messages;
  if (!costMode || typeof costMode !== "object") return messages;

  const receiptMessages = receipt as Record<string, unknown>;
  if (typeof receiptMessages.buyingAmount === "string") return messages;

  const fallbackLabel = (costMode as Record<string, unknown>).label;
  if (typeof fallbackLabel !== "string") return messages;

  return {
    ...messages,
    CommerceStock: {
      ...stockMessages,
      receipt: {
        ...receiptMessages,
        buyingAmount: fallbackLabel,
      },
    },
  } as T;
}

export default getRequestConfig(async ({ requestLocale }) => {
  const requestedLocale = await requestLocale;

  const locale = hasLocale(routing.locales, requestedLocale)
    ? requestedLocale
    : routing.defaultLocale;

  const [
    dashboardMessages,
    globalMessages,
    intelligenceMessages,
    identityMessages,
    marketingMessages,
    preferencesMessages,
    profileMessages,
    securityMessages,
    notificationMessages,
    workspaceMessages,
    workspaceRefinementMessages,
    commerceMessages,
    commerceStockMessages,
    commerceSalesMessages,
    commerceReturnsMessages,
    commerceFinanceMessages,
    commerceFinancingMessages,
  ] = await Promise.all([
    import(`@/i18n/messages/dashboard/${locale}.json`),
    import(`@/i18n/messages/global/${locale}.json`),
    import(`@/i18n/messages/intelligence/${locale}.json`),
    import(`@/i18n/messages/identity/${locale}.json`),
    import(`@/i18n/messages/marketing/${locale}.json`),
    import(`@/i18n/messages/preferences/${locale}.json`),
    import(`@/i18n/messages/profile/${locale}.json`),
    import(`@/i18n/messages/security/${locale}.json`),
    import(`@/i18n/messages/notifications/${locale}.json`),
    import(`@/i18n/messages/workspace/${locale}.json`),
    import(`@/i18n/messages/workspace-refinement/${locale}.json`),
    import(`@/i18n/messages/commerce/${locale}.json`),
    import(`@/i18n/messages/commerce-stock/${locale}.json`),
    import(`@/i18n/messages/commerce-sales/${locale}.json`),
    import(`@/i18n/messages/commerce-returns/${locale}.json`),
    import(`@/i18n/messages/commerce-finance/${locale}.json`),
    import(`@/i18n/messages/commerce-financing/${locale}.json`),
  ]);

  const messages = {
    ...dashboardMessages.default,
    ...globalMessages.default,
    ...intelligenceMessages.default,
    ...identityMessages.default,
    ...marketingMessages.default,
    ...preferencesMessages.default,
    ...profileMessages.default,
    ...securityMessages.default,
    ...notificationMessages.default,
    ...workspaceMessages.default,
    ...workspaceRefinementMessages.default,
    ...commerceMessages.default,
    ...commerceStockMessages.default,
    ...commerceSalesMessages.default,
    ...commerceReturnsMessages.default,
    ...commerceFinanceMessages.default,
    ...commerceFinancingMessages.default,
  };

  return {
    locale,
    messages: brandFrontendMessages(withCommerceStockReceiptFallback(messages)),
  };
});
