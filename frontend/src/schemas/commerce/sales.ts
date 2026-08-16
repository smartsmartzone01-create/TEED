import { z } from "zod";

import { createApiEnvelopeSchema } from "@/schemas/global/api";
import { decimal } from "@/schemas/commerce/shared";

const trackedIdentifierSchema = z.object({
  kind: z.string(),
  value: z.string(),
});

const saleAvailabilityUnitSchema = z.object({
  id: z.string(),
  internal_serial: z.string(),
  model_name: z.string(),
  brand: z.string(),
  color: z.string(),
  capacity: z.string(),
  identifiers: z.array(trackedIdentifierSchema),
  stock_reference: z.string(),
  batch_name: z.string(),
  group_name: z.string(),
});

const saleAvailabilityProductSchema = z.object({
  id: z.string(),
  name: z.string(),
  sku: z.string(),
  brand: z.string(),
  variant: z.string(),
  unit: z.string(),
  tracking_mode: z.enum(["quantity", "individual"]),
  current_quantity: decimal,
  selling_price: decimal.nullable(),
  available_units: z.array(saleAvailabilityUnitSchema),
});

const saleItemSchema = z
  .object({
    id: z.string(),
    source: z.enum(["catalog", "manual"]),
    product: z.string().nullable().transform((value) => value ?? ""),
    product_name: z.string(),
    product_sku: z.string(),
    tracked_unit: z.string().nullable(),
    tracked_unit_reference: z.string(),
    item_name: z.string(),
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
    customer_region: z.string(),
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
const saleAvailabilityResponseSchema = createApiEnvelopeSchema(
  z.object({ products: z.array(saleAvailabilityProductSchema) }),
);

export {
  saleAvailabilityProductSchema,
  saleAvailabilityResponseSchema,
  saleAvailabilityUnitSchema,
  saleItemSchema,
  saleResponseSchema,
  saleSchema,
  salesResponseSchema,
};
