import type { CSSProperties } from "react";

import { HeroSection } from "@/components/home/hero-section";
import { ServicesSection } from "@/components/home/services-section";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { getStorefrontSite } from "@/services/storefront-api";

export default async function HomePage() {
  const site = await getStorefrontSite();
  const themeStyle = {
    "--storefront-accent": site.theme.primaryColor,
    "--storefront-surface": site.theme.surfaceColor,
    "--storefront-text": site.theme.textColor,
  } as CSSProperties;

  return (
    <div style={themeStyle}>
      <SiteHeader site={site} />
      <main>
        <HeroSection site={site} />
        <ServicesSection site={site} />
      </main>
      <SiteFooter site={site} />
    </div>
  );
}
