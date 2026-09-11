import { z } from "zod";

import { createApiEnvelopeSchema } from "@/schemas/global/api";

const websiteSiteSchema = z.object({
  id: z.string().uuid(),
  public_key: z.string().uuid(),
  slug: z.string(),
  display_name: z.string(),
  default_locale: z.string(),
  supported_locales: z.array(z.string()),
  primary_color: z.string(),
  surface_color: z.string(),
  text_color: z.string(),
  contact_phone: z.string(),
  contact_email: z.string(),
  contact_whatsapp: z.string(),
  contact_instagram: z.string(),
  navigation: z.unknown(),
  hero: z.unknown(),
  services: z.unknown(),
  newsletter: z.unknown(),
  is_published: z.boolean(),
  created_at: z.string(),
  updated_at: z.string(),
});

const websiteMediaSchema = z.object({
  id: z.string().uuid(),
  kind: z.string(),
  public_url: z.string(),
  storage_key: z.string(),
  original_name: z.string(),
  mime_type: z.string(),
  alt_text: z.record(z.string(), z.string()),
  width: z.number().int().positive().nullable(),
  height: z.number().int().positive().nullable(),
  size_bytes: z.number().int().nonnegative().nullable(),
  sort_order: z.number().int().nonnegative(),
  created_at: z.string(),
  updated_at: z.string(),
});

const websiteSiteEnvelopeSchema = createApiEnvelopeSchema(websiteSiteSchema);
const websiteSiteListEnvelopeSchema = createApiEnvelopeSchema(
  z.object({ sites: z.array(websiteSiteSchema) }),
);
const websiteMediaEnvelopeSchema = createApiEnvelopeSchema(websiteMediaSchema);
const websiteMediaListEnvelopeSchema = createApiEnvelopeSchema(
  z.object({ media: z.array(websiteMediaSchema) }),
);
const websiteDeleteEnvelopeSchema = createApiEnvelopeSchema(z.null());

export {
  websiteDeleteEnvelopeSchema,
  websiteMediaEnvelopeSchema,
  websiteMediaListEnvelopeSchema,
  websiteMediaSchema,
  websiteSiteEnvelopeSchema,
  websiteSiteListEnvelopeSchema,
  websiteSiteSchema,
};
