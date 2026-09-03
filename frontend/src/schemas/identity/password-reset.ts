import { z } from "zod";

import { createApiEnvelopeSchema } from "@/schemas/global/api";

const passwordResetRequestResponseSchema = createApiEnvelopeSchema(
  z.object({ next_step: z.literal("verify_reset_code") }),
);
const passwordResetVerifyResponseSchema = createApiEnvelopeSchema(
  z.object({ next_step: z.literal("choose_new_password") }),
);
const passwordResetConfirmResponseSchema = createApiEnvelopeSchema(
  z.object({ next_step: z.literal("sign_in") }),
);

type PasswordResetValidationMessages = {
  code: string;
  identifier: string;
  password: string;
  passwordMatch: string;
  passwordMinimum: string;
};

function isRecoveryIdentifier(value: string) {
  return z.email().safeParse(value).success || /^\+[1-9]\d{7,14}$/.test(value);
}

function createPasswordResetRequestSchema(messages: PasswordResetValidationMessages) {
  return z.object({
    identifier: z
      .string()
      .trim()
      .min(1, messages.identifier)
      .refine(isRecoveryIdentifier, messages.identifier),
  });
}

function createPasswordResetVerifySchema(messages: PasswordResetValidationMessages) {
  return z.object({
    code: z.string().trim().regex(/^\d{6}$/, messages.code),
    identifier: z
      .string()
      .trim()
      .min(1, messages.identifier)
      .refine(isRecoveryIdentifier, messages.identifier),
  });
}

function createPasswordResetConfirmSchema(messages: PasswordResetValidationMessages) {
  return z
    .object({
      newPassword: z.string().min(1, messages.password).min(8, messages.passwordMinimum),
      newPasswordConfirm: z.string().min(1, messages.password),
    })
    .refine((values) => values.newPassword === values.newPasswordConfirm, {
      message: messages.passwordMatch,
      path: ["newPasswordConfirm"],
    });
}

export {
  createPasswordResetConfirmSchema,
  createPasswordResetRequestSchema,
  createPasswordResetVerifySchema,
  passwordResetConfirmResponseSchema,
  passwordResetRequestResponseSchema,
  passwordResetVerifyResponseSchema,
};
export type { PasswordResetValidationMessages };
