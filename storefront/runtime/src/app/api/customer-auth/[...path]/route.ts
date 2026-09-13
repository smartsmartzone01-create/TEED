import { NextRequest, NextResponse } from "next/server";

import {
  clearStorefrontCustomerSessionCookies,
  extractStorefrontCustomerAuthTokens,
  setStorefrontCustomerSessionCookies,
  STOREFRONT_CUSTOMER_ACCESS_COOKIE,
  STOREFRONT_CUSTOMER_REFRESH_COOKIE,
  stripStorefrontCustomerAuthTokens,
} from "@/lib/storefront-customer-session";
import {
  requestStorefrontCustomerAuth,
  StorefrontCustomerAuthUnavailableError,
} from "@/services/storefront-customer-auth";

export const dynamic = "force-dynamic";

const STOREFRONT_PASSWORD_RESET_COOKIE = "tunakuza_storefront_password_reset";

const FORWARDED_POST_PATHS = new Set([
  "register/email",
  "register/phone",
  "verify/email",
  "verify/phone",
  "login/email",
  "login/phone",
  "password-reset/request",
  "password-reset/verify",
]);

type RouteContext = {
  params: Promise<{ path: string[] }>;
};

type JsonObject = Record<string, unknown>;

async function readBackendPayload(response: Response): Promise<unknown> {
  const text = await response.text();
  if (!text) {
    return null;
  }

  try {
    return JSON.parse(text) as unknown;
  } catch {
    return {
      success: false,
      message: "The storefront authentication service returned an invalid response.",
      data: null,
    };
  }
}

function jsonResponse(payload: unknown, status: number): NextResponse {
  const response = NextResponse.json(payload, { status });
  response.headers.set("Cache-Control", "no-store");
  response.headers.set("Pragma", "no-cache");
  return response;
}

function errorResponse(message: string, status: number): NextResponse {
  return jsonResponse(
    {
      success: false,
      message,
      data: null,
    },
    status,
  );
}

function mutationOriginAllowed(request: NextRequest): boolean {
  const origin = request.headers.get("origin");
  if (!origin) {
    return true;
  }

  try {
    return new URL(origin).origin === request.nextUrl.origin;
  } catch {
    return false;
  }
}

function routePath(parts: string[]): string {
  return parts.join("/");
}

function isJsonObject(value: unknown): value is JsonObject {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function passwordResetGrant(payload: unknown): { grant: string; maxAge: number } | null {
  if (!isJsonObject(payload) || !isJsonObject(payload.data)) {
    return null;
  }
  const grant = payload.data.reset_grant;
  const maxAge = payload.data.reset_grant_expires_in;
  if (typeof grant !== "string" || typeof maxAge !== "number") {
    return null;
  }
  return { grant, maxAge: Math.max(0, Math.floor(maxAge)) };
}

function stripPasswordResetGrant(payload: unknown): unknown {
  if (!isJsonObject(payload) || !isJsonObject(payload.data)) {
    return payload;
  }
  const data = { ...payload.data };
  delete data.reset_grant;
  delete data.reset_grant_expires_in;
  return { ...payload, data };
}

function setPasswordResetCookie(
  response: NextResponse,
  grant: string,
  maxAge: number,
): void {
  response.cookies.set(STOREFRONT_PASSWORD_RESET_COOKIE, grant, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge,
  });
}

function clearPasswordResetCookie(response: NextResponse): void {
  response.cookies.delete(STOREFRONT_PASSWORD_RESET_COOKIE);
}

async function forwardAuthPost(request: NextRequest, path: string): Promise<NextResponse> {
  const body = await request.text();
  const backendResponse = await requestStorefrontCustomerAuth(path, {
    method: "POST",
    body: body || "{}",
  });
  const payload = await readBackendPayload(backendResponse);
  const responsePayload =
    path === "password-reset/verify"
      ? stripPasswordResetGrant(payload)
      : stripStorefrontCustomerAuthTokens(payload);
  const response = jsonResponse(responsePayload, backendResponse.status);

  if (backendResponse.ok) {
    if (path === "password-reset/verify") {
      const resetGrant = passwordResetGrant(payload);
      if (resetGrant) {
        setPasswordResetCookie(response, resetGrant.grant, resetGrant.maxAge);
      }
    } else {
      const tokens = extractStorefrontCustomerAuthTokens(payload);
      if (tokens) {
        setStorefrontCustomerSessionCookies(response, tokens);
      }
    }
  }

  return response;
}

async function confirmPasswordReset(request: NextRequest): Promise<NextResponse> {
  const resetGrant = request.cookies.get(STOREFRONT_PASSWORD_RESET_COOKIE)?.value;
  if (!resetGrant) {
    return errorResponse("The password reset session has expired. Request a new code.", 400);
  }

  let body: JsonObject;
  try {
    const parsed = JSON.parse((await request.text()) || "{}") as unknown;
    body = isJsonObject(parsed) ? parsed : {};
  } catch {
    body = {};
  }

  const backendResponse = await requestStorefrontCustomerAuth("password-reset/confirm", {
    method: "POST",
    body: JSON.stringify({ ...body, reset_grant: resetGrant }),
  });
  const payload = await readBackendPayload(backendResponse);
  const response = jsonResponse(payload, backendResponse.status);

  if (backendResponse.ok) {
    clearPasswordResetCookie(response);
    clearStorefrontCustomerSessionCookies(response);
  }
  return response;
}

async function refreshSession(request: NextRequest): Promise<NextResponse> {
  const refreshToken = request.cookies.get(STOREFRONT_CUSTOMER_REFRESH_COOKIE)?.value;
  if (!refreshToken) {
    const response = errorResponse("No storefront customer session is available.", 401);
    clearStorefrontCustomerSessionCookies(response);
    return response;
  }

  const backendResponse = await requestStorefrontCustomerAuth("session/refresh", {
    method: "POST",
    body: JSON.stringify({ refresh: refreshToken }),
  });
  const payload = await readBackendPayload(backendResponse);
  const response = jsonResponse(
    stripStorefrontCustomerAuthTokens(payload),
    backendResponse.status,
  );
  const tokens = extractStorefrontCustomerAuthTokens(payload);

  if (backendResponse.ok && tokens) {
    setStorefrontCustomerSessionCookies(response, tokens);
  } else if (backendResponse.status === 401) {
    clearStorefrontCustomerSessionCookies(response);
  }

  return response;
}

async function logoutSession(request: NextRequest): Promise<NextResponse> {
  const refreshToken = request.cookies.get(STOREFRONT_CUSTOMER_REFRESH_COOKIE)?.value;
  let response: NextResponse;

  if (!refreshToken) {
    response = jsonResponse(
      {
        success: true,
        message: "Signed out successfully.",
        data: null,
      },
      200,
    );
  } else {
    const backendResponse = await requestStorefrontCustomerAuth("session/logout", {
      method: "POST",
      body: JSON.stringify({ refresh: refreshToken }),
    });
    const payload = await readBackendPayload(backendResponse);
    response = jsonResponse(payload, backendResponse.status);
  }

  clearStorefrontCustomerSessionCookies(response);
  return response;
}

async function currentCustomer(request: NextRequest): Promise<NextResponse> {
  const accessToken = request.cookies.get(STOREFRONT_CUSTOMER_ACCESS_COOKIE)?.value;
  const refreshToken = request.cookies.get(STOREFRONT_CUSTOMER_REFRESH_COOKIE)?.value;

  if (!accessToken && !refreshToken) {
    return errorResponse("No storefront customer session is available.", 401);
  }

  if (accessToken) {
    const backendResponse = await requestStorefrontCustomerAuth("me", {
      method: "GET",
      accessToken,
    });
    const payload = await readBackendPayload(backendResponse);
    if (backendResponse.status !== 401 || !refreshToken) {
      const response = jsonResponse(payload, backendResponse.status);
      if (backendResponse.status === 401) {
        clearStorefrontCustomerSessionCookies(response);
      }
      return response;
    }
  }

  if (!refreshToken) {
    const response = errorResponse("The storefront customer session has expired.", 401);
    clearStorefrontCustomerSessionCookies(response);
    return response;
  }

  const refreshResponse = await requestStorefrontCustomerAuth("session/refresh", {
    method: "POST",
    body: JSON.stringify({ refresh: refreshToken }),
  });
  const refreshPayload = await readBackendPayload(refreshResponse);
  const tokens = extractStorefrontCustomerAuthTokens(refreshPayload);
  if (!refreshResponse.ok || !tokens) {
    const response = jsonResponse(
      stripStorefrontCustomerAuthTokens(refreshPayload),
      refreshResponse.status,
    );
    clearStorefrontCustomerSessionCookies(response);
    return response;
  }

  const backendResponse = await requestStorefrontCustomerAuth("me", {
    method: "GET",
    accessToken: tokens.access,
  });
  const payload = await readBackendPayload(backendResponse);
  const response = jsonResponse(payload, backendResponse.status);
  if (backendResponse.ok) {
    setStorefrontCustomerSessionCookies(response, tokens);
  } else {
    clearStorefrontCustomerSessionCookies(response);
  }
  return response;
}

export async function POST(request: NextRequest, context: RouteContext): Promise<NextResponse> {
  if (!mutationOriginAllowed(request)) {
    return errorResponse("Cross-origin storefront authentication requests are not allowed.", 403);
  }

  const { path } = await context.params;
  const target = routePath(path);

  try {
    if (FORWARDED_POST_PATHS.has(target)) {
      return await forwardAuthPost(request, target);
    }
    if (target === "password-reset/confirm") {
      return await confirmPasswordReset(request);
    }
    if (target === "refresh") {
      return await refreshSession(request);
    }
    if (target === "logout") {
      return await logoutSession(request);
    }
    return errorResponse("Storefront authentication route not found.", 404);
  } catch (error) {
    if (error instanceof StorefrontCustomerAuthUnavailableError) {
      return errorResponse(error.message, 503);
    }
    return errorResponse("The storefront authentication service is unavailable.", 502);
  }
}

export async function GET(request: NextRequest, context: RouteContext): Promise<NextResponse> {
  const { path } = await context.params;
  if (routePath(path) !== "me") {
    return errorResponse("Storefront authentication route not found.", 404);
  }

  try {
    return await currentCustomer(request);
  } catch (error) {
    if (error instanceof StorefrontCustomerAuthUnavailableError) {
      return errorResponse(error.message, 503);
    }
    return errorResponse("The storefront authentication service is unavailable.", 502);
  }
}
