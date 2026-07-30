import { z } from "zod";

import { createApiEnvelopeSchema } from "@/schemas/global/api";

const completionSchema = z.object({
  completed_fields: z.number().int().nonnegative(),
  percentage: z.number().int().min(0).max(100),
  total_required_fields: z.number().int().positive(),
});

const profileOverviewSchema = z.object({
  completion: completionSchema,
  prompts: z.array(
    z.object({
      destination: z.string(),
      key: z.string(),
      optional: z.boolean(),
    }),
  ),
  quick_links: z.array(z.string()),
  verified_contacts: z.object({
    email: z.boolean(),
    phone: z.boolean(),
  }),
});

const personalInformationSchema = z.object({
  country_code: z.string(),
  created_at: z.string(),
  email: z.string().nullable(),
  first_name: z.string(),
  id: z.string(),
  is_email_verified: z.boolean(),
  is_phone_verified: z.boolean(),
  last_name: z.string(),
  phone_number: z.string().nullable(),
  profile_image_url: z.string().nullable(),
  region: z.string(),
  username: z.string().nullable(),
});

const contactDetailSchema = z.object({
  managed_by: z.string(),
  purposes: z.array(z.string()),
  recovery_available: z.boolean(),
  value: z.string().nullable(),
  verified: z.boolean(),
});

const contactInformationSchema = z.object({
  email: contactDetailSchema,
  phone: contactDetailSchema,
});

const emptyDataSchema = z.unknown().nullable();

const profileOverviewEnvelopeSchema =
  createApiEnvelopeSchema(profileOverviewSchema);
const personalInformationEnvelopeSchema =
  createApiEnvelopeSchema(personalInformationSchema);
const contactInformationEnvelopeSchema =
  createApiEnvelopeSchema(contactInformationSchema);
const emptyProfileEnvelopeSchema =
  createApiEnvelopeSchema(emptyDataSchema);

function createProfileFormSchema(messages: {
  firstName: string;
  lastName: string;
  region: string;
  username: string;
}) {
  return z.object({
    countryCode: z.enum(["TZ", "KE", "UG"]),
    firstName: z.string().trim().min(1, messages.firstName).max(150),
    lastName: z.string().trim().min(1, messages.lastName).max(150),
    profileImage: z.custom<FileList>().optional(),
    region: z.string().trim().max(100, messages.region),
    username: z
      .string()
      .trim()
      .regex(/^[A-Za-z0-9_]{3,30}$/, messages.username),
  });
}

export {
  contactInformationEnvelopeSchema,
  createProfileFormSchema,
  emptyProfileEnvelopeSchema,
  personalInformationEnvelopeSchema,
  profileOverviewEnvelopeSchema,
};
