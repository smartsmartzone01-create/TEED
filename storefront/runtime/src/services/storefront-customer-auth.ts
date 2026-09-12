type StorefrontCustomerAuthConfig = {
  apiUrl: string;
  siteKey: string;
};

type StorefrontCustomerAuthRequest = {
  method?: "GET" | "POST";
  body?: string;
  accessToken?: string;
};

export class StorefrontCustomerAuthUnavailableError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "StorefrontCustomerAuthUnavailableError";
  }
}

function storefrontCustomerAuthConfig(): StorefrontCustomerAuthConfig {
  const demoMode = process.env.STOREFRONT_DEMO_MODE?.trim().toLowerCase() === "true";
  if (demoMode) {
    throw new StorefrontCustomerAuthUnavailableError(
      "Customer authentication is unavailable while storefront demo mode is enabled.",
    );
  }

  const apiUrl = process.env.STOREFRONT_API_URL?.replace(/\/$/, "") || null;
  const siteKey = process.env.STOREFRONT_SITE_KEY?.trim() || null;
  if (!apiUrl || !siteKey) {
    throw new StorefrontCustomerAuthUnavailableError(
      "Storefront customer authentication is not configured.",
    );
  }

  return { apiUrl, siteKey };
}

function storefrontCustomerAuthUrl(path: string): string {
  const { apiUrl, siteKey } = storefrontCustomerAuthConfig();
  return `${apiUrl}/api/public/storefront/sites/${encodeURIComponent(siteKey)}/auth/${path}/`;
}

export async function requestStorefrontCustomerAuth(
  path: string,
  options: StorefrontCustomerAuthRequest = {},
): Promise<Response> {
  const headers = new Headers({ Accept: "application/json" });
  if (options.body !== undefined) {
    headers.set("Content-Type", "application/json");
  }
  if (options.accessToken) {
    headers.set("Authorization", `Bearer ${options.accessToken}`);
  }

  return fetch(storefrontCustomerAuthUrl(path), {
    method: options.method ?? "POST",
    headers,
    body: options.body,
    cache: "no-store",
  });
}
