import type { z } from "zod";

import type {
  authenticatedUserDataSchema,
  createLoginFormSchema,
  createOnboardingFormSchema,
  createRegistrationFormSchema,
  verificationDataSchema,
} from "@/schemas/identity/entry";

type RegistrationFormValues = z.infer<
  ReturnType<typeof createRegistrationFormSchema>
>;
type LoginFormValues = z.infer<
  ReturnType<typeof createLoginFormSchema>
>;
type OnboardingFormValues = z.infer<
  ReturnType<typeof createOnboardingFormSchema>
>;
type AuthenticatedUserData = z.infer<
  typeof authenticatedUserDataSchema
>;
type VerificationData = z.infer<
  typeof verificationDataSchema
>;

export type {
  AuthenticatedUserData,
  LoginFormValues,
  OnboardingFormValues,
  RegistrationFormValues,
  VerificationData,
};
