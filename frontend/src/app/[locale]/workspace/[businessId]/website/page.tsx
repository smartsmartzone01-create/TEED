import { setRequestLocale } from "next-intl/server";

import { WebsiteHomepageManager } from "@/components/website/website-homepage-manager";

type WebsitePageProps = {
  params: Promise<{ businessId: string; locale: string }>;
};

export default async function WebsitePage({ params }: WebsitePageProps) {
  const { businessId, locale } = await params;
  setRequestLocale(locale);
  return <WebsiteHomepageManager businessId={businessId} locale={locale} />;
}
