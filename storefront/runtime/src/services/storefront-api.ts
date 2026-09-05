import { demoStorefrontSite } from "@/config/demo-site";
import type { StorefrontSiteConfig } from "@/types/storefront";

export async function getStorefrontSite(): Promise<StorefrontSiteConfig> {
  const apiUrl = process.env.STOREFRONT_API_URL?.replace(/\/$/, "");
  const siteKey = process.env.STOREFRONT_SITE_KEY;

  if (!apiUrl || !siteKey) {
    return demoStorefrontSite;
  }

  const response = await fetch(
    `${apiUrl}/api/public/storefront/sites/${encodeURIComponent(siteKey)}/`,
    { next: { revalidate: 60 } },
  );

  if (!response.ok) {
    throw new Error(`Storefront site request failed with status ${response.status}`);
  }

  const payload = (await response.json()) as
    | StorefrontSiteConfig
    | { data: StorefrontSiteConfig };

  return "data" in payload ? payload.data : payload;
}
