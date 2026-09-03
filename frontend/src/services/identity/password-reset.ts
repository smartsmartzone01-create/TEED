import {
  passwordResetConfirmResponseSchema,
  passwordResetRequestResponseSchema,
  passwordResetVerifyResponseSchema,
} from "@/schemas/identity/password-reset";
import { requestApi } from "@/services/global/api-client";
import { withCsrfRetry } from "@/services/identity/csrf";

async function requestPasswordReset(identifier: string) {
  return requestApi({
    body: { identifier },
    method: "POST",
    path: "/api/v1/identity/password-reset/request/",
    schema: passwordResetRequestResponseSchema,
  });
}

async function verifyPasswordResetCode(input: {
  code: string;
  identifier: string;
}) {
  return withCsrfRetry((token) =>
    requestApi({
      body: input,
      csrfToken: token,
      method: "POST",
      path: "/api/v1/identity/password-reset/verify/",
      schema: passwordResetVerifyResponseSchema,
    }),
  );
}

async function confirmPasswordReset(input: {
  new_password: string;
  new_password_confirm: string;
}) {
  return withCsrfRetry((token) =>
    requestApi({
      body: input,
      csrfToken: token,
      method: "POST",
      path: "/api/v1/identity/password-reset/confirm/",
      schema: passwordResetConfirmResponseSchema,
    }),
  );
}

export {
  confirmPasswordReset,
  requestPasswordReset,
  verifyPasswordResetCode,
};
