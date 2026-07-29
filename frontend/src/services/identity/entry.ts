import {
  csrfResponseSchema,
  loginResponseSchema,
  onboardingResponseSchema,
  registrationResponseSchema,
  resendResponseSchema,
  verificationResponseSchema,
} from "@/schemas/identity/entry";
import { requestApi } from "@/services/global/api-client";

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
  const token = await initializeCsrf();

  return requestApi({
    body: input,
    csrfToken: token,
    method: "POST",
    path: "/api/v1/identity/login/email/",
    schema: loginResponseSchema,
  });
}

async function verifyEmail(input: {
  code: string;
  email: string;
}) {
  const token = await initializeCsrf();

  return requestApi({
    body: input,
    csrfToken: token,
    method: "POST",
    path: "/api/v1/identity/email-verification/",
    schema: verificationResponseSchema,
  });
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

export {
  completeOnboarding,
  initializeCsrf,
  loginWithEmail,
  registerWithEmail,
  resendEmailVerification,
  verifyEmail,
};
