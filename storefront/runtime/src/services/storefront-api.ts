import { demoStorefrontProducts } from "@/config/demo-catalog";
import { demoStorefrontSite } from "@/config/demo-site";
import type { StorefrontProductListing, StorefrontSiteConfig } from "@/types/storefront";

type StorefrontRuntimeConfig =
  | { demoMode: true; apiUrl: null; siteKey: null }
  | { demoMode: false; apiUrl: string; siteKey: string };

function storefrontRuntimeConfig(): StorefrontRuntimeConfig {
  const apiUrl = process.env.STOREFRONT_API_URL?.replace(/\/$/, "") || null;
  const siteKey = process.env.STOREFRONT_SITE_KEY?.trim() || null;
  const demoMode = process.env.STOREFRONT_DEMO_MODE?.trim().toLowerCase() === "true";

  if (demoMode) {
    return { demoMode: true, apiUrl: null, siteKey: null };
  }

  if (!apiUrl || !siteKey) {
    throw new Error(
      "Storefront runtime is not configured. Set STOREFRONT_API_URL and STOREFRONT_SITE_KEY, or explicitly enable STOREFRONT_DEMO_MODE=true for demo data.",
    );
  }

  return { demoMode: false, apiUrl, siteKey };
}

function publicSiteBase(apiUrl: string, siteKey: string): string {
  return `${apiUrl}/api/public/storefront/sites/${encodeURIComponent(siteKey)}`;
}

function unwrapData<T>(payload: T | { data: T }): T {
  return typeof payload === "object" && payload !== null && "data" in payload
    ? (payload as { data: T }).data
    : (payload as T);
}

export async function getStorefrontSite(): Promise<StorefrontSiteConfig> {
  const config = storefrontRuntimeConfig();

  if (config.demoMode) {
    return demoStorefrontSite;
  }

  const response = await fetch(`${publicSiteBase(config.apiUrl, config.siteKey)}/`, {
    next: { revalidate: 60 },
  });

  if (!response.ok) {
    throw new Error(`Storefront site request failed with status ${response.status}`);
  }

  const payload = (await response.json()) as StorefrontSiteConfig | { data: StorefrontSiteConfig };
  return unwrapData(payload);
}

export async function getStorefrontProducts(): Promise<StorefrontProductListing[]> {
  const config = storefrontRuntimeConfig();

  if (config.demoMode) {
    return demoStorefrontProducts;
  }

  const response = await fetch(`${publicSiteBase(config.apiUrl, config.siteKey)}/products/`, {
    next: { revalidate: 30 },
  });

  if (!response.ok) {
    throw new Error(`Storefront products request failed with status ${response.status}`);
  }

  const payload = (await response.json()) as
    | StorefrontProductListing[]
    | { data: StorefrontProductListing[] }
    | { data: { products: StorefrontProductListing[] } }
    | { products: StorefrontProductListing[] };

  if (Array.isArray(payload)) {
    return payload;
  }

  if ("products" in payload) {
    return payload.products;
  }

  const data = payload.data;
  return Array.isArray(data) ? data : data.products;
}

export async function getStorefrontProduct(slug: string): Promise<StorefrontProductListing | null> {
  const config = storefrontRuntimeConfig();

  if (config.demoMode) {
    return demoStorefrontProducts.find((product) => product.slug === slug) ?? null;
  }

  const response = await fetch(
    `${publicSiteBase(config.apiUrl, config.siteKey)}/products/${encodeURIComponent(slug)}/`,
    { next: { revalidate: 30 } },
  );

  if (response.status === 404) {
    return null;
  }

  if (!response.ok) {
    throw new Error(`Storefront product request failed with status ${response.status}`);
  }

  const payload = (await response.json()) as StorefrontProductListing | { data: StorefrontProductListing };
  return unwrapData(payload);
}
