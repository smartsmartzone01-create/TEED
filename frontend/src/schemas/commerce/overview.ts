import { z } from "zod";

import { createApiEnvelopeSchema } from "@/schemas/global/api";
import { productSchema } from "@/schemas/commerce/catalog";
import { saleSchema } from "@/schemas/commerce/sales";
import { decimal } from "@/schemas/commerce/shared";

const decisionSchema = z
  .object({
    id: z.string(),
    key: z.string(),
    severity: z.enum(["info", "attention", "urgent"]),
    title: z.string(),
    explanation: z.string(),
    action_path: z.string(),
  })
  .passthrough();

const stockOverviewSchema = z
  .object({
    id: z.string(),
    reference: z.string(),
    status: z.string(),
    supplier_name: z.string(),
    received_at: z.string().nullable(),
    product_type_count: z.number(),
    quantities_by_unit: z.array(
      z.object({ unit: z.string(), quantity: decimal }),
    ),
    total_buying_value: decimal,
  })
  .passthrough();

const returnOverviewSchema = z
  .object({
    id: z.string(),
    receipt_number: z.string(),
    resolution: z.string(),
    reason: z.string(),
    total: decimal,
    returned_at: z.string(),
  })
  .passthrough();

const pulseSchema = z.object({
  revenue: decimal,
  cost_of_goods: decimal.nullable(),
  gross_profit: decimal.nullable(),
  operating_result: decimal.nullable(),
  expenses: decimal.nullable(),
  sales_count: z.number(),
  low_stock_count: z.number(),
  available_skus: z.number(),
  sold_out_skus: z.number(),
  stock_value: decimal.nullable(),
  confidence: z.enum(["partial", "reliable"]),
  can_manage_finance: z.boolean(),
});

const overviewResponseSchema = createApiEnvelopeSchema(
  z.object({
    pulse: pulseSchema,
    decisions: z.array(decisionSchema).default([]),
    recent_sales: z.array(saleSchema),
    recent_stock: z.array(stockOverviewSchema),
    recent_returns: z.array(returnOverviewSchema),
    sold_out_items: z.array(productSchema),
  }),
);

export {
  decisionSchema,
  overviewResponseSchema,
  pulseSchema,
  returnOverviewSchema,
  stockOverviewSchema,
};
