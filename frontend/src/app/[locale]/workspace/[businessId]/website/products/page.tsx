import { setRequestLocale } from "next-intl/server";

import { WebsiteProductManager } from "@/components/website/website-product-manager";

type WebsiteProductsPageProps = {
  params: Promise<{ businessId: string; locale: string }>;
};

export default async function WebsiteProductsPage({ params }: WebsiteProductsPageProps) {
  const { businessId, locale } = await params;
  setRequestLocale(locale);
  return <WebsiteProductManager businessId={businessId} />;
}
