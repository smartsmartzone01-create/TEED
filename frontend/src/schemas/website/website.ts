import { z } from "zod";

import { createApiEnvelopeSchema } from "@/schemas/global/api";

const localeMapSchema = z.record(z.string(), z.string());

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
  alt_text: localeMapSchema,
  width: z.number().int().positive().nullable(),
  height: z.number().int().positive().nullable(),
  size_bytes: z.number().int().nonnegative().nullable(),
  sort_order: z.number().int().nonnegative(),
  created_at: z.string(),
  updated_at: z.string(),
});

const websiteVariantSchema = z.object({
  id: z.string().uuid(),
  sku: z.string(),
  options: z.record(z.string(), z.string()),
  website_price: z.string().nullable(),
  currency: z.string(),
  website_availability: z.enum(["in_stock", "low_stock", "out_of_stock"]),
  media_id: z.string().uuid().nullable(),
  commerce_product_id: z.string().uuid().nullable(),
  price_source: z.enum(["website", "commerce"]),
  availability_source: z.enum(["website", "commerce"]),
  is_published: z.boolean(),
  sort_order: z.number().int().nonnegative(),
  created_at: z.string(),
  updated_at: z.string(),
});

const websiteListingSchema = z.object({
  id: z.string().uuid(),
  slug: z.string(),
  title: localeMapSchema,
  short_description: localeMapSchema,
  description: localeMapSchema,
  brand: z.string(),
  badge: localeMapSchema,
  primary_media_id: z.string().uuid().nullable(),
  options: z.array(z.unknown()),
  is_published: z.boolean(),
  sort_order: z.number().int().nonnegative(),
  variants: z.array(websiteVariantSchema),
  created_at: z.string(),
  updated_at: z.string(),
});

const websiteCommerceProductSchema = z.object({
  id: z.string().uuid(),
  family_id: z.string().uuid().nullable(),
  family_name: z.string(),
  name: z.string(),
  sku: z.string(),
  brand: z.string(),
  variant: z.string(),
  variant_options: z.unknown(),
  tracking_mode: z.string(),
  linked: z.boolean(),
  website_listing_id: z.string().uuid().nullable(),
  website_variant_id: z.string().uuid().nullable(),
});

const websiteCommerceImportResultSchema = z.object({
  requested_product_ids: z.array(z.string().uuid()),
  imported_product_ids: z.array(z.string().uuid()),
  created_listings: z.number().int().nonnegative(),
  created_variants: z.number().int().nonnegative(),
  existing_variants: z.number().int().nonnegative(),
});

const websiteSiteEnvelopeSchema = createApiEnvelopeSchema(websiteSiteSchema);
const websiteSiteListEnvelopeSchema = createApiEnvelopeSchema(
  z.object({ sites: z.array(websiteSiteSchema) }),
);
const websiteMediaEnvelopeSchema = createApiEnvelopeSchema(websiteMediaSchema);
const websiteMediaListEnvelopeSchema = createApiEnvelopeSchema(
  z.object({ media: z.array(websiteMediaSchema) }),
);
const websiteListingEnvelopeSchema = createApiEnvelopeSchema(websiteListingSchema);
const websiteListingListEnvelopeSchema = createApiEnvelopeSchema(
  z.object({ listings: z.array(websiteListingSchema) }),
);
const websiteVariantEnvelopeSchema = createApiEnvelopeSchema(websiteVariantSchema);
const websiteVariantListEnvelopeSchema = createApiEnvelopeSchema(
  z.object({ variants: z.array(websiteVariantSchema) }),
);
const websiteCommerceCatalogEnvelopeSchema = createApiEnvelopeSchema(
  z.object({ products: z.array(websiteCommerceProductSchema) }),
);
const websiteCommerceImportEnvelopeSchema = createApiEnvelopeSchema(
  websiteCommerceImportResultSchema,
);
const websiteDeleteEnvelopeSchema = createApiEnvelopeSchema(z.null());

export {
  websiteCommerceCatalogEnvelopeSchema,
  websiteCommerceImportEnvelopeSchema,
  websiteCommerceImportResultSchema,
  websiteCommerceProductSchema,
  websiteDeleteEnvelopeSchema,
  websiteListingEnvelopeSchema,
  websiteListingListEnvelopeSchema,
  websiteListingSchema,
  websiteMediaEnvelopeSchema,
  websiteMediaListEnvelopeSchema,
  websiteMediaSchema,
  websiteSiteEnvelopeSchema,
  websiteSiteListEnvelopeSchema,
  websiteSiteSchema,
  websiteVariantEnvelopeSchema,
  websiteVariantListEnvelopeSchema,
  websiteVariantSchema,
};
