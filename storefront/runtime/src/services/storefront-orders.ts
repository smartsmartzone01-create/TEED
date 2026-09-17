type StorefrontOrderBackendConfig = {
  apiUrl: string;
  siteKey: string;
};

export class StorefrontOrdersUnavailableError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "StorefrontOrdersUnavailableError";
  }
}

function storefrontOrderConfig(): StorefrontOrderBackendConfig {
  const demoMode = process.env.STOREFRONT_DEMO_MODE?.trim().toLowerCase() === "true";
  if (demoMode) {
    throw new StorefrontOrdersUnavailableError(
      "Ordering is unavailable while storefront demo mode is enabled.",
    );
  }

  const apiUrl = process.env.STOREFRONT_API_URL?.replace(/\/$/, "") || null;
  const siteKey = process.env.STOREFRONT_SITE_KEY?.trim() || null;
  if (!apiUrl || !siteKey) {
    throw new StorefrontOrdersUnavailableError(
      "Storefront ordering is not configured.",
    );
  }

  return { apiUrl, siteKey };
}

export async function requestStorefrontOrder(body: string): Promise<Response> {
  const { apiUrl, siteKey } = storefrontOrderConfig();
  return fetch(
    `${apiUrl}/api/public/storefront/sites/${encodeURIComponent(siteKey)}/orders/`,
    {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body,
      cache: "no-store",
    },
  );
}
