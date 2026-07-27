import { setRequestLocale } from "next-intl/server";

import { MarketingHeader } from "@/components/marketing/marketing-header";
import { MarketingHero } from "@/components/marketing/marketing-hero";
import { MarketingStage } from "@/components/marketing/marketing-stage";
import { PlatformConnections } from "@/components/marketing/platform-connections";
import { TeedOverview } from "@/components/marketing/teed-overview";

type HomePageProps = {
  params: Promise<{
    locale: string;
  }>;
};

export default async function HomePage({
  params,
}: HomePageProps) {
  const { locale } = await params;

  setRequestLocale(locale);

  return (
    <MarketingStage>
      <MarketingHeader />

      <main>
        <MarketingHero />
        <PlatformConnections />
        <TeedOverview />
      </main>
    </MarketingStage>
  );
}