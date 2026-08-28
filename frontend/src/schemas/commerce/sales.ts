import { z } from "zod";

import { decimal } from "@/schemas/commerce/shared";
import { createApiEnvelopeSchema } from "@/schemas/global/api";

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

const saleStockTargetSchema = z.object({
  id: z.string(),
  name: z.string(),
  sku: z.string(),
  brand: z.string(),
  variant: z.string(),
  unit: z.string(),
});

const saleAvailabilityProductSchema = saleStockTargetSchema.extend({
  tracking_mode: z.enum(["quantity", "individual"]),
  current_quantity: decimal,
  selling_price: decimal.nullable(),
  available_units: z.array(saleAvailabilityUnitSchema),
});

const trackedSaleUnitDetailsSchema = z.object({
  model_name: z.string(),
  brand: z.string(),
  color: z.string(),
  capacity: z.string(),
  condition: z.string(),
  internal_serial: z.string(),
  identifiers: z.array(trackedIdentifierSchema),
});

const saleItemSchema = z
  .object({
    id: z.string(),
    source: z.enum(["catalog", "manual"]),
    product: z.string().nullable().transform((value) => value ?? ""),
    product_name: z.string(),
    product_sku: z.string(),
    product_unit: z.string().default(""),
    tracked_unit: z.string().nullable(),
    tracked_unit_reference: z.string(),
    tracked_unit_details: trackedSaleUnitDetailsSchema.nullable(),
    item_name: z.string(),
    item_details: z.record(z.string(), z.string()).default({}),
    acquisition_unit_cost: decimal.nullable(),
    quantity: decimal,
    unit_price: decimal,
    line_total: decimal,
    cost_total: decimal.optional(),
    returned_quantity: decimal,
  })
  .passthrough();

const tradeInDetailSchema = z.object({
  incoming_item_name: z.string(),
  incoming_item_details: z.record(z.string(), z.string()).default({}),
  incoming_value: decimal,
  cash_top_up: decimal,
  add_to_stock: z.boolean(),
  stock_product: z.string().nullable(),
  stock_product_sku: z.string(),
  stock_group_name: z.string(),
  stock_receipt: z.string().nullable(),
  stock_receipt_reference: z.string(),
});

const saleSchema = z
  .object({
    id: z.string(),
    receipt_number: z.string(),
    sale_mode: z.enum(["stock", "independent", "trade_in"]),
    transaction_type: z.enum(["normal", "trade_in"]),
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
    trade_in: tradeInDetailSchema.nullable(),
    recorded_by: z.string(),
    status: z.enum(["active", "voided"]),
  })
  .passthrough();

const salesResponseSchema = createApiEnvelopeSchema(
  z.object({ sales: z.array(saleSchema) }),
);
const saleResponseSchema = createApiEnvelopeSchema(saleSchema);
const saleAvailabilityResponseSchema = createApiEnvelopeSchema(
  z.object({
    products: z.array(saleAvailabilityProductSchema),
    stock_targets: z.array(saleStockTargetSchema),
  }),
);

export {
  saleAvailabilityProductSchema,
  saleAvailabilityResponseSchema,
  saleAvailabilityUnitSchema,
  saleItemSchema,
  saleResponseSchema,
  saleSchema,
  salesResponseSchema,
  saleStockTargetSchema,
  tradeInDetailSchema,
};
