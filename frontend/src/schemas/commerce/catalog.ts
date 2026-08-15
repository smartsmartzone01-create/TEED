import { z } from "zod";

import { createApiEnvelopeSchema } from "@/schemas/global/api";
import { decimal } from "@/schemas/commerce/shared";

const productSchema = z
  .object({
    id: z.string(),
    name: z.string(),
    sku: z.string(),
    barcode: z.string(),
    group: z.string(),
    brand: z.string(),
    variant: z.string(),
    unit: z.string(),
    selling_price: decimal.nullable(),
    tracking_mode: z.enum(["quantity", "individual"]),
    low_stock_threshold: decimal,
    current_quantity: decimal,
    is_active: z.boolean(),
  })
  .passthrough();

const productsResponseSchema = createApiEnvelopeSchema(
  z.object({ products: z.array(productSchema) }),
);
const productResponseSchema = createApiEnvelopeSchema(productSchema);

export { productResponseSchema, productSchema, productsResponseSchema };
