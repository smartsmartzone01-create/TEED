import { NextRequest, NextResponse } from "next/server";

import {
  requestStorefrontOrder,
  StorefrontOrdersUnavailableError,
} from "@/services/storefront-orders";

export const dynamic = "force-dynamic";

function mutationOriginAllowed(request: NextRequest): boolean {
  const origin = request.headers.get("origin");
  if (!origin) return true;

  try {
    return new URL(origin).origin === request.nextUrl.origin;
  } catch {
    return false;
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

async function readBackendPayload(response: Response): Promise<unknown> {
  const text = await response.text();
  if (!text) return null;

  try {
    return JSON.parse(text) as unknown;
  } catch {
    return {
      success: false,
      message: "The ordering service returned an invalid response.",
      data: null,
    };
  }
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  if (!mutationOriginAllowed(request)) {
    return errorResponse("Cross-origin storefront order requests are not allowed.", 403);
  }

  try {
    const backendResponse = await requestStorefrontOrder((await request.text()) || "{}");
    const payload = await readBackendPayload(backendResponse);
    return jsonResponse(payload, backendResponse.status);
  } catch (error) {
    if (error instanceof StorefrontOrdersUnavailableError) {
      return errorResponse(error.message, 503);
    }
    return errorResponse("The storefront ordering service is unavailable.", 502);
  }
}
