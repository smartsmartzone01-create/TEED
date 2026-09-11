import { setRequestLocale } from "next-intl/server";

import { WebsiteCommerceConnectionManager } from "@/components/website/website-commerce-connection-manager";

type WebsiteCommercePageProps = {
  params: Promise<{ businessId: string; locale: string }>;
};

export default async function WebsiteCommercePage({ params }: WebsiteCommercePageProps) {
  const { businessId, locale } = await params;
  setRequestLocale(locale);
  return <WebsiteCommerceConnectionManager businessId={businessId} />;
}
