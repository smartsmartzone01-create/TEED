import { setRequestLocale } from "next-intl/server";

import { WebsiteProductManagement } from "@/components/website/website-product-management";

type WebsiteProductsPageProps = {
  params: Promise<{ businessId: string; locale: string }>;
};

export default async function WebsiteProductsPage({ params }: WebsiteProductsPageProps) {
  const { businessId, locale } = await params;
  setRequestLocale(locale);
  return <WebsiteProductManagement businessId={businessId} locale={locale} />;
}
