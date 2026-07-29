import {
  csrfResponseSchema,
  loginResponseSchema,
  onboardingResponseSchema,
  refreshResponseSchema,
  registrationResponseSchema,
  resendResponseSchema,
  verificationResponseSchema,
} from "@/schemas/identity/entry";
import {
  ApiClientError,
  requestApi,
} from "@/services/global/api-client";

let csrfToken: string | null = null;
let csrfRequest: Promise<string> | null = null;
let sessionRestoreRequest: ReturnType<
  typeof performSessionRestore
> | null = null;

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

async function registerWithEmail(input: {
  email: string;
  password: string;
}) {
  return requestApi({
    body: input,
    method: "POST",
    path: "/api/v1/identity/registration/email/",
    schema: registrationResponseSchema,
  });
}

async function loginWithEmail(input: {
  email: string;
  password: string;
}) {
  return withCsrfRetry((token) =>
    requestApi({
      body: input,
      csrfToken: token,
      method: "POST",
      path: "/api/v1/identity/login/email/",
      schema: loginResponseSchema,
    }),
  );
}

async function verifyEmail(input: {
  code: string;
  email: string;
}) {
  return withCsrfRetry((token) =>
    requestApi({
      body: input,
      csrfToken: token,
      method: "POST",
      path: "/api/v1/identity/email-verification/",
      schema: verificationResponseSchema,
    }),
  );
}

async function resendEmailVerification(email: string) {
  return requestApi({
    body: { email },
    method: "POST",
    path: "/api/v1/identity/email-verification/resend/",
    schema: resendResponseSchema,
  });
}

async function completeOnboarding(
  input: {
    country_code: "KE" | "TZ" | "UG";
    phone_number: string;
    username: string;
  },
  accessToken: string,
) {
  return requestApi({
    accessToken,
    body: input,
    method: "POST",
    path: "/api/v1/identity/onboarding/",
    schema: onboardingResponseSchema,
  });
}

async function performSessionRestore() {
  const request = () =>
    withCsrfRetry((token) =>
      requestApi({
        csrfToken: token,
        method: "POST",
        path: "/api/v1/identity/session/refresh/",
        schema: refreshResponseSchema,
      }),
    );

  if (
    typeof navigator !== "undefined" &&
    navigator.locks
  ) {
    return navigator.locks.request(
      "teed-session-refresh",
      request,
    );
  }

  return request();
}

function restoreSession() {
  if (sessionRestoreRequest) {
    return sessionRestoreRequest;
  }

  sessionRestoreRequest = performSessionRestore().finally(
    () => {
      sessionRestoreRequest = null;
    },
  );

  return sessionRestoreRequest;
}

async function logoutCurrentSession() {
  return withCsrfRetry((token) =>
    requestApi({
      csrfToken: token,
      method: "POST",
      path: "/api/v1/identity/session/logout/",
      schema: resendResponseSchema,
    }),
  );
}

export {
  completeOnboarding,
  initializeCsrf,
  loginWithEmail,
  logoutCurrentSession,
  registerWithEmail,
  resendEmailVerification,
  restoreSession,
  verifyEmail,
};
