import { z } from "zod";
import { createApiEnvelopeSchema } from "@/schemas/global/api";

const decimal = z.union([z.string(), z.number()]).transform(String);
const productSchema = z.object({
  id: z.string(), name: z.string(), sku: z.string(), variant: z.string(), unit: z.string(),
  selling_price: decimal, low_stock_threshold: decimal, current_quantity: decimal,
  is_active: z.boolean(),
}).passthrough();
const saleItemSchema = z.object({
  id: z.string(), product: z.string(), product_name: z.string(), quantity: decimal,
  unit_price: decimal, line_total: decimal, cost_total: decimal.optional(), returned_quantity: decimal,
}).passthrough();
const saleSchema = z.object({
  id: z.string(), receipt_number: z.string(), sale_type: z.enum(["retail", "wholesale"]),
  customer_name: z.string(), customer_phone: z.string(), subtotal: decimal, discount: decimal,
  total: decimal, cost_of_goods: decimal.optional(), gross_profit: decimal.optional(),
  payment_status: z.enum(["paid", "partial", "unpaid"]), sold_at: z.string(),
  items: z.array(saleItemSchema), recorded_by: z.string(), status: z.enum(["active", "voided"]),
}).passthrough();
const decisionSchema = z.object({
  id: z.string(), key: z.string(), severity: z.enum(["info", "attention", "urgent"]),
  title: z.string(), explanation: z.string(), action_path: z.string(),
}).passthrough();
const pulseSchema = z.object({
  revenue: decimal, cost_of_goods: decimal.nullable(), gross_profit: decimal.nullable(),
  operating_result: decimal.nullable(), expenses: decimal.nullable(), sales_count: z.number(),
  low_stock_count: z.number(), stock_value: decimal.nullable(),
  confidence: z.enum(["partial", "reliable"]), can_manage_finance: z.boolean(),
});

const overviewResponseSchema = createApiEnvelopeSchema(z.object({
  pulse: pulseSchema, decisions: z.array(decisionSchema), recent_sales: z.array(saleSchema),
}));
const productsResponseSchema = createApiEnvelopeSchema(z.object({ products: z.array(productSchema) }));
const productResponseSchema = createApiEnvelopeSchema(productSchema);
const salesResponseSchema = createApiEnvelopeSchema(z.object({ sales: z.array(saleSchema) }));
const saleResponseSchema = createApiEnvelopeSchema(saleSchema);
const genericResponseSchema = createApiEnvelopeSchema(z.unknown());

export { genericResponseSchema, overviewResponseSchema, productResponseSchema, productsResponseSchema, saleResponseSchema, salesResponseSchema };
