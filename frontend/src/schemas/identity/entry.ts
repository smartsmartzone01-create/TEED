import { z } from "zod";

import { createApiEnvelopeSchema } from "@/schemas/global/api";

const countryCodeSchema = z.enum(["KE", "TZ", "UG"]);
const nextStepSchema = z.enum([
  "complete_onboarding",
  "dashboard",
  "verify_email",
  "verify_phone",
]);
const protectionStepSchema = z
  .enum(["add_email", "verify_email", "verify_phone"])
  .nullable();

const accessTokenSchema = z.object({
  access: z.string().min(1),
  expires_in: z.number().positive(),
  token_type: z.literal("Bearer"),
});

const emailRegistrationDataSchema = z.object({
  email: z.email(),
  next_step: z.literal("verify_email"),
  user_id: z.uuid(),
});

const phoneRegistrationDataSchema = z.object({
  country_code: countryCodeSchema,
  next_step: z.literal("verify_phone"),
  phone_number: z.string().min(1),
  user_id: z.uuid(),
});

const authenticatedUserDataSchema = z.object({
  country_code: z.string().nullable().optional(),
  email: z.email().nullable(),
  is_email_verified: z.boolean().optional().default(false),
  is_onboarding_complete: z.boolean(),
  is_phone_verified: z.boolean().optional().default(false),
  next_step: z.enum(["complete_onboarding", "dashboard"]),
  phone_number: z.string().nullable().optional(),
  suggested_username: z.string().nullable().optional(),
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

const phoneVerificationDataSchema = z.object({
  country_code: z.string(),
  email: z.email().nullable(),
  is_phone_verified: z.literal(true),
  next_step: z.literal("complete_onboarding"),
  phone_number: z.string().min(1),
  tokens: accessTokenSchema,
  user_id: z.uuid(),
});

const csrfDataSchema = z.object({
  csrf_token: z.string().min(1),
});

const currentUserSchema = z.object({
  country_code: z.string().nullable(),
  email: z.email().nullable(),
  first_name: z.string(),
  id: z.uuid(),
  is_email_verified: z.boolean(),
  is_onboarding_complete: z.boolean(),
  is_phone_verified: z.boolean(),
  last_name: z.string(),
  phone_number: z.string().nullable(),
  suggested_username: z.string().nullable().optional(),
  username: z.string().nullable(),
});

const refreshDataSchema = z.object({
  tokens: accessTokenSchema,
  user: currentUserSchema,
});

const onboardingDataSchema = z.object({
  country_code: countryCodeSchema,
  email: z.email().nullable(),
  is_email_verified: z.boolean(),
  is_onboarding_complete: z.literal(true),
  is_phone_verified: z.boolean(),
  next_step: z.literal("dashboard"),
  phone_number: z.string().min(1),
  recommended_step: protectionStepSchema,
  user_id: z.uuid(),
  username: z.string().min(1),
});

const accountProtectionDataSchema = z.object({
  email: z.email().nullable(),
  is_email_verified: z.boolean(),
  is_phone_verified: z.boolean(),
  phone_number: z.string().nullable(),
  recommended_step: protectionStepSchema,
});

const registrationResponseSchema =
  createApiEnvelopeSchema(emailRegistrationDataSchema);
const phoneRegistrationResponseSchema =
  createApiEnvelopeSchema(phoneRegistrationDataSchema);
const loginResponseSchema = createApiEnvelopeSchema(authenticatedUserDataSchema);
const verificationResponseSchema = createApiEnvelopeSchema(verificationDataSchema);
const phoneVerificationResponseSchema =
  createApiEnvelopeSchema(phoneVerificationDataSchema);
const resendResponseSchema = createApiEnvelopeSchema(z.null());
const csrfResponseSchema = createApiEnvelopeSchema(csrfDataSchema);
const onboardingResponseSchema = createApiEnvelopeSchema(onboardingDataSchema);
const refreshResponseSchema = createApiEnvelopeSchema(refreshDataSchema);
const accountProtectionResponseSchema =
  createApiEnvelopeSchema(accountProtectionDataSchema);

type ValidationMessages = {
  code: string;
  email: string;
  password: string;
  passwordMatch: string;
  passwordMinimum: string;
  phone: string;
  username: string;
};

function createRegistrationFormSchema(messages: ValidationMessages) {
  return z
    .object({
      countryCode: countryCodeSchema,
      email: z.string(),
      method: z.enum(["email", "phone"]),
      password: z
        .string()
        .min(1, messages.password)
        .min(8, messages.passwordMinimum),
      passwordConfirm: z.string().min(1, messages.password),
      phoneNumber: z.string(),
    })
    .superRefine((values, context) => {
      if (
        values.method === "email" &&
        !z.email().safeParse(values.email).success
      ) {
        context.addIssue({
          code: "custom",
          message: messages.email,
          path: ["email"],
        });
      }
      if (values.method === "phone" && !values.phoneNumber.trim()) {
        context.addIssue({
          code: "custom",
          message: messages.phone,
          path: ["phoneNumber"],
        });
      }
      if (values.password !== values.passwordConfirm) {
        context.addIssue({
          code: "custom",
          message: messages.passwordMatch,
          path: ["passwordConfirm"],
        });
      }
    });
}

function createLoginFormSchema(messages: ValidationMessages) {
  return z
    .object({
      countryCode: countryCodeSchema,
      email: z.string(),
      method: z.enum(["email", "phone"]),
      password: z.string().min(1, messages.password),
      phoneNumber: z.string(),
    })
    .superRefine((values, context) => {
      if (
        values.method === "email" &&
        !z.email().safeParse(values.email).success
      ) {
        context.addIssue({
          code: "custom",
          message: messages.email,
          path: ["email"],
        });
      }
      if (values.method === "phone" && !values.phoneNumber.trim()) {
        context.addIssue({
          code: "custom",
          message: messages.phone,
          path: ["phoneNumber"],
        });
      }
    });
}

function createVerificationFormSchema(messages: ValidationMessages) {
  return z.object({
    code: z.string().regex(/^\d{6}$/, messages.code),
    email: z.email(messages.email),
  });
}

function createPhoneVerificationFormSchema(messages: ValidationMessages) {
  return z.object({
    code: z.string().regex(/^\d{6}$/, messages.code),
    phoneNumber: z.string().min(1, messages.phone),
  });
}

function createOnboardingFormSchema(messages: ValidationMessages) {
  return z.object({
    countryCode: countryCodeSchema,
    phoneNumber: z.string().min(1, messages.phone),
    username: z
      .string()
      .trim()
      .min(3, messages.username)
      .max(30, messages.username),
  });
}

export {
  accountProtectionResponseSchema,
  authenticatedUserDataSchema,
  createLoginFormSchema,
  createOnboardingFormSchema,
  createPhoneVerificationFormSchema,
  createRegistrationFormSchema,
  createVerificationFormSchema,
  csrfResponseSchema,
  loginResponseSchema,
  nextStepSchema,
  onboardingResponseSchema,
  phoneRegistrationResponseSchema,
  phoneVerificationDataSchema,
  phoneVerificationResponseSchema,
  protectionStepSchema,
  refreshResponseSchema,
  registrationResponseSchema,
  resendResponseSchema,
  verificationDataSchema,
  verificationResponseSchema,
};
export type { ValidationMessages };
