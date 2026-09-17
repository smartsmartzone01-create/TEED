import type {
  StorefrontApiEnvelope,
  StorefrontCustomerProfile,
} from "@/types/storefront-customer-auth";

export type StorefrontCustomerChannel = "email" | "phone";

export type StorefrontCustomerRegistrationResult = {
  next_step: "verify_email" | "verify_phone";
};

export type StorefrontCustomerSessionResult = {
  customer: StorefrontCustomerProfile;
};

export type StorefrontPasswordResetRequestResult = {
  next_step: "verify_reset_code";
};

export type StorefrontPasswordResetVerifyResult = {
  next_step: "choose_new_password";
};

export type StorefrontPasswordResetConfirmResult = {
  next_step: "sign_in";
};

export class StorefrontCustomerRequestError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly errors?: unknown,
  ) {
    super(message);
    this.name = "StorefrontCustomerRequestError";
  }
}

async function requestCustomerAuth<T>(
  path: string,
  init: RequestInit = {},
): Promise<StorefrontApiEnvelope<T>> {
  const response = await fetch(`/api/customer-auth/${path}`, {
    ...init,
    credentials: "same-origin",
    headers: {
      "Content-Type": "application/json",
      ...init.headers,
    },
  });
  const payload = (await response.json()) as StorefrontApiEnvelope<T>;

  if (!response.ok) {
    throw new StorefrontCustomerRequestError(
      payload.message || "The storefront customer request failed.",
      response.status,
      payload.errors,
    );
  }

  return payload;
}

export async function getCurrentStorefrontCustomer(): Promise<StorefrontCustomerProfile | null> {
  try {
    const payload = await requestCustomerAuth<StorefrontCustomerSessionResult>("me", {
      method: "GET",
    });
    return payload.data.customer;
  } catch (error) {
    if (error instanceof StorefrontCustomerRequestError && error.status === 401) {
      return null;
    }
    throw error;
  }
}

export async function registerStorefrontCustomer(
  channel: StorefrontCustomerChannel,
  payload: Record<string, string>,
): Promise<StorefrontCustomerRegistrationResult> {
  const response = await requestCustomerAuth<StorefrontCustomerRegistrationResult>(
    `register/${channel}`,
    {
      method: "POST",
      body: JSON.stringify(payload),
    },
  );
  return response.data;
}

export async function verifyStorefrontCustomer(
  channel: StorefrontCustomerChannel,
  payload: Record<string, string>,
): Promise<StorefrontCustomerProfile> {
  const response = await requestCustomerAuth<StorefrontCustomerSessionResult>(
    `verify/${channel}`,
    {
      method: "POST",
      body: JSON.stringify(payload),
    },
  );
  return response.data.customer;
}

export async function loginStorefrontCustomer(
  channel: StorefrontCustomerChannel,
  payload: Record<string, string>,
): Promise<StorefrontCustomerProfile> {
  const response = await requestCustomerAuth<StorefrontCustomerSessionResult>(
    `login/${channel}`,
    {
      method: "POST",
      body: JSON.stringify(payload),
    },
  );
  return response.data.customer;
}

export async function requestStorefrontCustomerPasswordReset(
  payload: Record<string, string>,
): Promise<StorefrontPasswordResetRequestResult> {
  const response = await requestCustomerAuth<StorefrontPasswordResetRequestResult>(
    "password-reset/request",
    {
      method: "POST",
      body: JSON.stringify(payload),
    },
  );
  return response.data;
}

export async function verifyStorefrontCustomerPasswordReset(
  payload: Record<string, string>,
): Promise<StorefrontPasswordResetVerifyResult> {
  const response = await requestCustomerAuth<StorefrontPasswordResetVerifyResult>(
    "password-reset/verify",
    {
      method: "POST",
      body: JSON.stringify(payload),
    },
  );
  return response.data;
}

export async function confirmStorefrontCustomerPasswordReset(
  payload: Record<string, string>,
): Promise<StorefrontPasswordResetConfirmResult> {
  const response = await requestCustomerAuth<StorefrontPasswordResetConfirmResult>(
    "password-reset/confirm",
    {
      method: "POST",
      body: JSON.stringify(payload),
    },
  );
  return response.data;
}

export async function logoutStorefrontCustomer(): Promise<void> {
  await requestCustomerAuth<null>("logout", {
    method: "POST",
    body: "{}",
  });
}
