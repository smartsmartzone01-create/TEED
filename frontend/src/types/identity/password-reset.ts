import type { z } from "zod";

import type {
  createPasswordResetConfirmSchema,
  createPasswordResetRequestSchema,
  createPasswordResetVerifySchema,
} from "@/schemas/identity/password-reset";

type PasswordResetRequestValues = z.infer<
  ReturnType<typeof createPasswordResetRequestSchema>
>;
type PasswordResetVerifyValues = z.infer<
  ReturnType<typeof createPasswordResetVerifySchema>
>;
type PasswordResetConfirmValues = z.infer<
  ReturnType<typeof createPasswordResetConfirmSchema>
>;

export type {
  PasswordResetConfirmValues,
  PasswordResetRequestValues,
  PasswordResetVerifyValues,
};
