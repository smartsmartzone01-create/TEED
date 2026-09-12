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

const FORWARDED_POST_PATHS = new Set([
  "register/email",
  "register/phone",
  "verify/email",
  "verify/phone",
  "login/email",
  "login/phone",
]);

type RouteContext = {
  params: Promise<{ path: string[] }>;
};

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

async function forwardAuthPost(request: NextRequest, path: string): Promise<NextResponse> {
  const body = await request.text();
  const backendResponse = await requestStorefrontCustomerAuth(path, {
    method: "POST",
    body: body || "{}",
  });
  const payload = await readBackendPayload(backendResponse);
  const response = jsonResponse(
    stripStorefrontCustomerAuthTokens(payload),
    backendResponse.status,
  );

  if (backendResponse.ok) {
    const tokens = extractStorefrontCustomerAuthTokens(payload);
    if (tokens) {
      setStorefrontCustomerSessionCookies(response, tokens);
    }
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
