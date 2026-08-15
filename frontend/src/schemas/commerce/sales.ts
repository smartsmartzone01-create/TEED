import { z } from "zod";

import { createApiEnvelopeSchema } from "@/schemas/global/api";
import { decimal } from "@/schemas/commerce/shared";

const saleItemSchema = z
  .object({
    id: z.string(),
    product: z.string(),
    product_name: z.string(),
    quantity: decimal,
    unit_price: decimal,
    line_total: decimal,
    cost_total: decimal.optional(),
    returned_quantity: decimal,
  })
  .passthrough();

const saleSchema = z
  .object({
    id: z.string(),
    receipt_number: z.string(),
    sale_type: z.enum(["retail", "wholesale"]),
    customer_name: z.string(),
    customer_phone: z.string(),
    subtotal: decimal,
    discount: decimal,
    total: decimal,
    cost_of_goods: decimal.optional(),
    gross_profit: decimal.optional(),
    payment_status: z.enum(["paid", "partial", "unpaid"]),
    sold_at: z.string(),
    items: z.array(saleItemSchema),
    recorded_by: z.string(),
    status: z.enum(["active", "voided"]),
  })
  .passthrough();

const salesResponseSchema = createApiEnvelopeSchema(
  z.object({ sales: z.array(saleSchema) }),
);
const saleResponseSchema = createApiEnvelopeSchema(saleSchema);

export { saleItemSchema, saleResponseSchema, saleSchema, salesResponseSchema };
