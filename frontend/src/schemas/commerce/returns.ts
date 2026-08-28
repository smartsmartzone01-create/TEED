import { z } from "zod";

import { decimal } from "@/schemas/commerce/shared";
import { saleSchema } from "@/schemas/commerce/sales";
import { createApiEnvelopeSchema } from "@/schemas/global/api";

const returnItemSchema = z.object({
  id: z.string(),
  sale_item: z.string(),
  sale_item_name: z.string(),
  sale_item_sku: z.string(),
  quantity: decimal,
  condition: z.enum(["sellable", "damaged"]),
  amount: decimal,
  cost_total: decimal,
});

const returnReplacementSchema = z.object({
  id: z.string(),
  source: z.enum(["stock", "independent"]),
  product: z.string().nullable(),
  product_name: z.string(),
  product_sku: z.string(),
  tracked_unit: z.string().nullable(),
  tracked_unit_reference: z.string(),
  item_name: z.string(),
  item_details: z.record(z.string(), z.string()),
  quantity: decimal,
  acquisition_unit_cost: decimal.nullable(),
  cost_total: decimal,
});

const returnSchema = z.object({
  id: z.string(),
  return_number: z.string(),
  sale: z.string(),
  receipt_number: z.string(),
  resolution: z.enum(["refund", "replacement", "credit"]),
  reason: z.string(),
  total: decimal,
  refund_amount: decimal,
  credit_amount: decimal,
  recovered_inventory_cost: decimal,
  damaged_loss: decimal,
  replacement_cost: decimal,
  returned_at: z.string(),
  items: z.array(returnItemSchema),
  replacement: returnReplacementSchema.nullable(),
});

const returnsWorkspaceResponseSchema = createApiEnvelopeSchema(
  z.object({
    returns: z.array(returnSchema),
    sales: z.array(saleSchema),
  }),
);

const returnResponseSchema = createApiEnvelopeSchema(returnSchema);

export { returnResponseSchema, returnSchema, returnsWorkspaceResponseSchema };
