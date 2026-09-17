import { NextResponse } from "next/server";

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

export async function GET(): Promise<NextResponse> {
  try {
    const backendResponse = await requestStorefrontCustomerAuth("google/config", {
      method: "GET",
    });
    const text = await backendResponse.text();
    const payload = text ? (JSON.parse(text) as unknown) : null;
    return jsonResponse(payload, backendResponse.status);
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
