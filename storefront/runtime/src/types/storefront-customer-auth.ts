export type StorefrontCustomerProfile = {
  id: string;
  email: string | null;
  phone_number: string | null;
  first_name: string;
  last_name: string;
  is_email_verified: boolean;
  is_phone_verified: boolean;
};

export type StorefrontCustomerAuthTokens = {
  access: string;
  refresh: string;
  token_type: string;
  access_expires_in: number;
  refresh_expires_at: string;
  session_id: string;
};

export type StorefrontApiEnvelope<T> = {
  success: boolean;
  message: string;
  data: T;
  errors?: unknown;
  meta?: unknown;
};

export type StorefrontAuthenticatedCustomerData = {
  customer: StorefrontCustomerProfile;
  tokens: StorefrontCustomerAuthTokens;
};
