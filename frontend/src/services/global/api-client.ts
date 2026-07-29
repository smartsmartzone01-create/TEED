import type { z } from "zod";

import {
  createNetworkError,
  normalizeApiFailure,
} from "@/lib/global/api-errors";
import type {
  ApiEnvelope,
  NormalizedApiError,
} from "@/types/global/api";

const developmentApiBaseUrl =
  process.env.NODE_ENV === "development"
    ? "http://127.0.0.1:8000"
    : "";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/$/, "") ??
  developmentApiBaseUrl;

type ApiRequestOptions<T> = {
  accessToken?: string;
  body?: unknown;
  csrfToken?: string;
  method?: "DELETE" | "GET" | "PATCH" | "POST" | "PUT";
  path: string;
  schema: z.ZodType<ApiEnvelope<T>>;
  signal?: AbortSignal;
};

class ApiClientError extends Error {
  readonly details: NormalizedApiError;

  constructor(details: NormalizedApiError) {
    super(details.message);
    this.name = "ApiClientError";
    this.details = details;
  }
}

function buildUrl(path: string) {
  const normalizedPath = path.startsWith("/")
    ? path
    : `/${path}`;

  return `${API_BASE_URL}${normalizedPath}`;
}

async function parseJson(response: Response) {
  const contentType = response.headers.get("content-type");

  if (!contentType?.includes("application/json")) {
    return undefined;
  }

  return response.json() as Promise<unknown>;
}

async function requestApi<T>({
  accessToken,
  body,
  csrfToken,
  method = "GET",
  path,
  schema,
  signal,
}: ApiRequestOptions<T>) {
  const headers = new Headers({
    Accept: "application/json",
  });

  if (body !== undefined) {
    headers.set("Content-Type", "application/json");
  }

  if (accessToken) {
    headers.set("Authorization", `Bearer ${accessToken}`);
  }

  if (csrfToken) {
    headers.set("X-CSRFToken", csrfToken);
  }

  let response: Response;

  try {
    response = await fetch(buildUrl(path), {
      body: body === undefined ? undefined : JSON.stringify(body),
      credentials: "include",
      headers,
      method,
      signal,
    });
  } catch (error) {
    throw new ApiClientError(createNetworkError(error));
  }

  const rawPayload = await parseJson(response);
  const parsedPayload = schema.safeParse(rawPayload);

  if (!parsedPayload.success) {
    if (!response.ok) {
      throw new ApiClientError(
        normalizeApiFailure(response.status),
      );
    }

    throw new ApiClientError({
      code: "invalid_server_response",
      fieldErrors: {},
      kind: "server",
      message:
        "TEED received an invalid response from the server.",
      status: response.status,
    });
  }

  const payload = parsedPayload.data;

  if (!response.ok || !payload.success) {
    throw new ApiClientError(
      normalizeApiFailure(response.status, payload),
    );
  }

  return payload;
}

export { ApiClientError, requestApi };
export type { ApiRequestOptions };
