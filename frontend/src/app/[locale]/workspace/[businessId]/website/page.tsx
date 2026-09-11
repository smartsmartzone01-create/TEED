import { setRequestLocale } from "next-intl/server";

import { WebsiteMediaManager } from "@/components/website/website-media-manager";

type WebsitePageProps = {
  params: Promise<{ businessId: string; locale: string }>;
};

export default async function WebsitePage({ params }: WebsitePageProps) {
  const { businessId, locale } = await params;
  setRequestLocale(locale);
  return <WebsiteMediaManager businessId={businessId} />;
}
