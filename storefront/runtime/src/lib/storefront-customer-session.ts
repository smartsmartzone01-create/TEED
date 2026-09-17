import type { NextResponse } from "next/server";

import type { StorefrontCustomerAuthTokens } from "@/types/storefront-customer-auth";

export const STOREFRONT_CUSTOMER_ACCESS_COOKIE = "tunakuza_storefront_customer_access";
export const STOREFRONT_CUSTOMER_REFRESH_COOKIE = "tunakuza_storefront_customer_refresh";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isStorefrontCustomerAuthTokens(value: unknown): value is StorefrontCustomerAuthTokens {
  if (!isRecord(value)) {
    return false;
  }

  return (
    typeof value.access === "string" &&
    typeof value.refresh === "string" &&
    typeof value.token_type === "string" &&
    typeof value.access_expires_in === "number" &&
    typeof value.refresh_expires_at === "string" &&
    typeof value.session_id === "string"
  );
}

export function extractStorefrontCustomerAuthTokens(
  payload: unknown,
): StorefrontCustomerAuthTokens | null {
  if (!isRecord(payload) || !isRecord(payload.data)) {
    return null;
  }

  return isStorefrontCustomerAuthTokens(payload.data.tokens) ? payload.data.tokens : null;
}

export function stripStorefrontCustomerAuthTokens(payload: unknown): unknown {
  if (!isRecord(payload) || !isRecord(payload.data) || !("tokens" in payload.data)) {
    return payload;
  }

  const data = Object.fromEntries(
    Object.entries(payload.data).filter(([key]) => key !== "tokens"),
  );
  return { ...payload, data };
}

export function setStorefrontCustomerSessionCookies(
  response: NextResponse,
  tokens: StorefrontCustomerAuthTokens,
): void {
  const secure = process.env.NODE_ENV === "production";
  response.cookies.set(STOREFRONT_CUSTOMER_ACCESS_COOKIE, tokens.access, {
    httpOnly: true,
    secure,
    sameSite: "lax",
    path: "/",
    maxAge: Math.max(1, Math.floor(tokens.access_expires_in)),
  });

  const refreshExpiresAt = new Date(tokens.refresh_expires_at);
  response.cookies.set(STOREFRONT_CUSTOMER_REFRESH_COOKIE, tokens.refresh, {
    httpOnly: true,
    secure,
    sameSite: "lax",
    path: "/",
    ...(Number.isNaN(refreshExpiresAt.getTime()) ? {} : { expires: refreshExpiresAt }),
  });
}

export function clearStorefrontCustomerSessionCookies(response: NextResponse): void {
  response.cookies.set(STOREFRONT_CUSTOMER_ACCESS_COOKIE, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
  response.cookies.set(STOREFRONT_CUSTOMER_REFRESH_COOKIE, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
}
