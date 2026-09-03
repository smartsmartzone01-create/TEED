import {
  loginResponseSchema,
  onboardingResponseSchema,
  phoneRegistrationResponseSchema,
  phoneVerificationResponseSchema,
  refreshResponseSchema,
  registrationResponseSchema,
  resendResponseSchema,
  verificationResponseSchema,
} from "@/schemas/identity/entry";
import { requestApi } from "@/services/global/api-client";
import { initializeCsrf, withCsrfRetry } from "@/services/identity/csrf";

let sessionRestoreRequest: ReturnType<typeof performSessionRestore> | null = null;

async function registerWithEmail(input: { email: string; password: string }) {
  return requestApi({
    body: input,
    method: "POST",
    path: "/api/v1/identity/registration/email/",
    schema: registrationResponseSchema,
  });
}

async function registerWithPhone(input: {
  country_code: "KE" | "TZ" | "UG";
  phone_number: string;
  password: string;
}) {
  return requestApi({
    body: input,
    method: "POST",
    path: "/api/v1/identity/registration/phone/",
    schema: phoneRegistrationResponseSchema,
  });
}

async function authenticateWithGoogle(input: { credential: string }) {
  return withCsrfRetry((token) =>
    requestApi({
      body: input,
      csrfToken: token,
      method: "POST",
      path: "/api/v1/identity/google/",
      schema: loginResponseSchema,
    }),
  );
}

async function loginWithEmail(input: { email: string; password: string }) {
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

async function loginWithPhone(input: {
  country_code: "KE" | "TZ" | "UG";
  phone_number: string;
  password: string;
}) {
  return withCsrfRetry((token) =>
    requestApi({
      body: input,
      csrfToken: token,
      method: "POST",
      path: "/api/v1/identity/login/phone/",
      schema: loginResponseSchema,
    }),
  );
}

async function verifyEmail(input: { code: string; email: string }) {
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

async function verifyPhone(input: { code: string; phone_number: string }) {
  return withCsrfRetry((token) =>
    requestApi({
      body: input,
      csrfToken: token,
      method: "POST",
      path: "/api/v1/identity/phone-verification/",
      schema: phoneVerificationResponseSchema,
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

async function resendPhoneVerification(phoneNumber: string) {
  return requestApi({
    body: { phone_number: phoneNumber },
    method: "POST",
    path: "/api/v1/identity/phone-verification/resend/",
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

  if (typeof navigator !== "undefined" && navigator.locks) {
    return navigator.locks.request("teed-session-refresh", request);
  }
  return request();
}

function restoreSession() {
  if (sessionRestoreRequest) return sessionRestoreRequest;
  sessionRestoreRequest = performSessionRestore().finally(() => {
    sessionRestoreRequest = null;
  });
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
  authenticateWithGoogle,
  completeOnboarding,
  initializeCsrf,
  loginWithEmail,
  loginWithPhone,
  logoutCurrentSession,
  registerWithEmail,
  registerWithPhone,
  resendEmailVerification,
  resendPhoneVerification,
  restoreSession,
  verifyEmail,
  verifyPhone,
};
