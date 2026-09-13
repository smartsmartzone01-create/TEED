import type {
  StorefrontApiEnvelope,
  StorefrontCustomerProfile,
} from "@/types/storefront-customer-auth";

import { StorefrontCustomerRequestError } from "./storefront-customer-auth-client";

type GoogleConfig = {
  enabled: boolean;
  client_id: string | null;
};

type GoogleLoginResult = {
  customer: StorefrontCustomerProfile;
};

async function readEnvelope<T>(response: Response): Promise<StorefrontApiEnvelope<T>> {
  const payload = (await response.json()) as StorefrontApiEnvelope<T>;
  if (!response.ok) {
    throw new StorefrontCustomerRequestError(
      payload.message || "The storefront Google request failed.",
      response.status,
      payload.errors,
    );
  }
  return payload;
}

export async function getStorefrontGoogleConfig(): Promise<GoogleConfig> {
  const response = await fetch("/api/customer-auth/google/config", {
    method: "GET",
    credentials: "same-origin",
    cache: "no-store",
  });
  return (await readEnvelope<GoogleConfig>(response)).data;
}

export async function loginStorefrontCustomerWithGoogle(
  credential: string,
): Promise<StorefrontCustomerProfile> {
  const response = await fetch("/api/customer-auth/google", {
    method: "POST",
    credentials: "same-origin",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ credential }),
  });
  return (await readEnvelope<GoogleLoginResult>(response)).data.customer;
}
