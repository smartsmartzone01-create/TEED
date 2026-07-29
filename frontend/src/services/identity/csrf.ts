import {
  csrfResponseSchema,
} from "@/schemas/identity/entry";
import {
  ApiClientError,
  requestApi,
} from "@/services/global/api-client";

let csrfToken: string | null = null;
let csrfRequest: Promise<string> | null = null;

async function initializeCsrf() {
  if (csrfToken) {
    return csrfToken;
  }

  if (!csrfRequest) {
    csrfRequest = requestApi({
      path: "/api/v1/identity/session/csrf/",
      schema: csrfResponseSchema,
    })
      .then((response) => {
        const token = response.data?.csrf_token;

        if (!token) {
          throw new Error("CSRF token missing from response.");
        }

        csrfToken = token;
        return token;
      })
      .finally(() => {
        csrfRequest = null;
      });
  }

  return csrfRequest;
}

async function withCsrfRetry<T>(
  request: (token: string) => Promise<T>,
) {
  let token = await initializeCsrf();

  try {
    return await request(token);
  } catch (error) {
    if (
      !(error instanceof ApiClientError) ||
      error.details.code !== "csrf_failed"
    ) {
      throw error;
    }

    csrfToken = null;
    token = await initializeCsrf();
    return request(token);
  }
}

export { initializeCsrf, withCsrfRetry };
