import { z } from "zod";

import { createApiEnvelopeSchema } from "@/schemas/global/api";
import { decimal } from "@/schemas/commerce/shared";

const productVariantOptionSchema = z.object({
  key: z.string(),
  label: z.string(),
  value: z.string(),
});

const productFamilySchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  brand: z.string(),
});

const productSchema = z
  .object({
    id: z.string(),
    name: z.string(),
    sku: z.string(),
    barcode: z.string(),
    group: z.string(),
    family: z.string().nullable(),
    family_name: z.string(),
    brand: z.string(),
    variant: z.string(),
    variant_options: z.array(productVariantOptionSchema).default([]),
    unit: z.string(),
    selling_price: decimal.nullable(),
    tracking_mode: z.enum(["quantity", "individual"]),
    low_stock_threshold: decimal,
    current_quantity: decimal,
    is_active: z.boolean(),
  })
  .passthrough();

const productsResponseSchema = createApiEnvelopeSchema(
  z.object({
    products: z.array(productSchema),
    families: z.array(productFamilySchema).default([]),
  }),
);
const productResponseSchema = createApiEnvelopeSchema(productSchema);

export {
  productFamilySchema,
  productResponseSchema,
  productSchema,
  productVariantOptionSchema,
  productsResponseSchema,
};
