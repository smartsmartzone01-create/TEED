import type { z } from "zod";

import type {
  authenticatedUserDataSchema,
  createLoginFormSchema,
  createOnboardingFormSchema,
  createPhoneVerificationFormSchema,
  createRegistrationFormSchema,
  phoneVerificationDataSchema,
  verificationDataSchema,
} from "@/schemas/identity/entry";

type RegistrationFormValues = z.infer<ReturnType<typeof createRegistrationFormSchema>>;
type LoginFormValues = z.infer<ReturnType<typeof createLoginFormSchema>>;
type OnboardingFormValues = z.infer<ReturnType<typeof createOnboardingFormSchema>>;
type PhoneVerificationFormValues = z.infer<
  ReturnType<typeof createPhoneVerificationFormSchema>
>;
type AuthenticatedUserData = z.infer<typeof authenticatedUserDataSchema>;
type VerificationData = z.infer<typeof verificationDataSchema>;
type PhoneVerificationData = z.infer<typeof phoneVerificationDataSchema>;

export type {
  AuthenticatedUserData,
  LoginFormValues,
  OnboardingFormValues,
  PhoneVerificationData,
  PhoneVerificationFormValues,
  RegistrationFormValues,
  VerificationData,
};
