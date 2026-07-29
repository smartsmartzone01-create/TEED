import { z } from "zod";

import { createApiEnvelopeSchema } from "@/schemas/global/api";

const nextStepSchema = z.enum([
  "complete_onboarding",
  "dashboard",
  "verify_email",
]);

const accessTokenSchema = z.object({
  access: z.string().min(1),
  expires_in: z.number().positive(),
  token_type: z.literal("Bearer"),
});

const registrationDataSchema = z.object({
  email: z.email(),
  next_step: z.literal("verify_email"),
  user_id: z.uuid(),
});

const authenticatedUserDataSchema = z.object({
  email: z.email(),
  is_onboarding_complete: z.boolean(),
  next_step: z.enum(["complete_onboarding", "dashboard"]),
  tokens: accessTokenSchema,
  user_id: z.uuid(),
  username: z.string().nullable(),
});

const verificationDataSchema = z.object({
  email: z.email(),
  is_email_verified: z.literal(true),
  next_step: z.literal("complete_onboarding"),
  tokens: accessTokenSchema,
  user_id: z.uuid(),
});

const csrfDataSchema = z.object({
  csrf_token: z.string().min(1),
});

const onboardingDataSchema = z.object({
  country_code: z.enum(["KE", "TZ", "UG"]),
  email: z.email(),
  is_onboarding_complete: z.literal(true),
  next_step: z.literal("dashboard"),
  phone_number: z.string().min(1),
  user_id: z.uuid(),
  username: z.string().min(1),
});

const registrationResponseSchema =
  createApiEnvelopeSchema(registrationDataSchema);
const loginResponseSchema = createApiEnvelopeSchema(
  authenticatedUserDataSchema,
);
const verificationResponseSchema =
  createApiEnvelopeSchema(verificationDataSchema);
const resendResponseSchema =
  createApiEnvelopeSchema(z.null());
const csrfResponseSchema =
  createApiEnvelopeSchema(csrfDataSchema);
const onboardingResponseSchema =
  createApiEnvelopeSchema(onboardingDataSchema);

type ValidationMessages = {
  code: string;
  email: string;
  password: string;
  passwordMatch: string;
  passwordMinimum: string;
  phone: string;
  username: string;
};

function createRegistrationFormSchema(
  messages: ValidationMessages,
) {
  return z
    .object({
      email: z.email(messages.email),
      password: z
        .string()
        .min(1, messages.password)
        .min(8, messages.passwordMinimum),
      passwordConfirm: z.string().min(1, messages.password),
    })
    .refine(
      (values) => values.password === values.passwordConfirm,
      {
        message: messages.passwordMatch,
        path: ["passwordConfirm"],
      },
    );
}

function createLoginFormSchema(messages: ValidationMessages) {
  return z.object({
    email: z.email(messages.email),
    password: z.string().min(1, messages.password),
  });
}

function createVerificationFormSchema(
  messages: ValidationMessages,
) {
  return z.object({
    code: z
      .string()
      .regex(/^\d{6}$/, messages.code),
    email: z.email(messages.email),
  });
}

function createOnboardingFormSchema(
  messages: ValidationMessages,
) {
  return z.object({
    countryCode: z.enum(["KE", "TZ", "UG"]),
    phoneNumber: z.string().min(1, messages.phone),
    username: z
      .string()
      .trim()
      .min(3, messages.username)
      .max(30, messages.username),
  });
}

export {
  authenticatedUserDataSchema,
  createLoginFormSchema,
  createOnboardingFormSchema,
  createRegistrationFormSchema,
  createVerificationFormSchema,
  csrfResponseSchema,
  loginResponseSchema,
  nextStepSchema,
  onboardingResponseSchema,
  registrationResponseSchema,
  resendResponseSchema,
  verificationResponseSchema,
};
export type { ValidationMessages };
