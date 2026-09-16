import { NextRequest, NextResponse } from "next/server";

import {
  extractStorefrontCustomerAuthTokens,
  setStorefrontCustomerSessionCookies,
  stripStorefrontCustomerAuthTokens,
} from "@/lib/storefront-customer-session";
import {
  requestStorefrontCustomerAuth,
  StorefrontCustomerAuthUnavailableError,
} from "@/services/storefront-customer-auth";

export const dynamic = "force-dynamic";

function jsonResponse(payload: unknown, status: number): NextResponse {
  const response = NextResponse.json(payload, { status });
  response.headers.set("Cache-Control", "no-store");
  response.headers.set("Pragma", "no-cache");
  return response;
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

export async function POST(request: NextRequest): Promise<NextResponse> {
  if (!mutationOriginAllowed(request)) {
    return jsonResponse(
      {
        success: false,
        message: "Cross-origin storefront authentication requests are not allowed.",
        data: null,
      },
      403,
    );
  }

  try {
    const backendResponse = await requestStorefrontCustomerAuth("login/google", {
      method: "POST",
      body: (await request.text()) || "{}",
    });
    const text = await backendResponse.text();
    const payload = text ? (JSON.parse(text) as unknown) : null;
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
  } catch (error) {
    if (error instanceof StorefrontCustomerAuthUnavailableError) {
      return jsonResponse(
        { success: false, message: error.message, data: null },
        503,
      );
    }
    return jsonResponse(
      {
        success: false,
        message: "The storefront Google authentication service is unavailable.",
        data: null,
      },
      502,
    );
  }
}
