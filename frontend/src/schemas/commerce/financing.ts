import { z } from "zod";

import { decimal } from "@/schemas/commerce/shared";
import { createApiEnvelopeSchema } from "@/schemas/global/api";

const financingAvailabilityProductSchema = z.object({
  id: z.string(),
  name: z.string(),
  sku: z.string(),
  unit: z.string(),
  tracking_mode: z.enum(["quantity", "individual"]),
  current_quantity: decimal,
  selling_price: decimal.nullable(),
  available_units: z.array(
    z.object({
      id: z.string(),
      label: z.string(),
    }),
  ),
});

const financingPaymentSchema = z.object({
  id: z.string(),
  amount: decimal,
  paid_at: z.string(),
  method: z.string(),
  reference: z.string(),
  created_at: z.string(),
});

const financingDocumentSchema = z.object({
  id: z.string(),
  original_name: z.string(),
  description: z.string(),
  created_at: z.string(),
  download_path: z.string(),
});

const financingItemSchema = z.object({
  id: z.string(),
  product: z.string().nullable(),
  product_name: z.string(),
  product_sku: z.string(),
  product_unit: z.string().default(""),
  tracked_unit: z.string().nullable(),
  item_name: z.string(),
  item_details: z.record(z.string(), z.string()).default({}),
  quantity: decimal,
  unit_price: decimal,
  line_total: decimal,
  acquisition_unit_cost: decimal.nullable().optional(),
  cost_total: decimal.optional(),
  warranty_months: z.union([z.literal(3), z.literal(6), z.literal(12), z.literal(24)]).nullable(),
});

const financingAgreementSchema = z
  .object({
    id: z.string(),
    reference: z.string(),
    agreement_type: z.enum(["loan", "installment"]),
    transaction_type: z.enum(["normal", "upfront", "trade_in"]),
    source: z.enum(["stock", "independent"]),
    market_type: z.enum(["retail", "wholesale"]),
    financing_mode: z.enum(["business", "partner"]),
    status: z.enum(["active", "due", "overdue", "paid", "cancelled"]),
    customer_name: z.string(),
    customer_phone: z.string(),
    customer_region: z.string(),
    contract_total: decimal,
    upfront_cash: decimal,
    trade_in_item_name: z.string(),
    trade_in_credit: decimal,
    contribution_total: decimal,
    installment_amount: decimal,
    frequency: z.enum(["weekly", "monthly"]),
    next_due_date: z.string().nullable(),
    release_threshold_percent: decimal,
    product_released_at: z.string().nullable(),
    partner_name: z.string().optional(),
    partner_settlement_amount: decimal.nullable().optional(),
    partner_settlement_received: z.boolean().optional(),
    business_commission: decimal.optional(),
    payments_total: decimal,
    outstanding_balance: decimal,
    expected_business_income: decimal.optional(),
    notes: z.string(),
    items: z.array(financingItemSchema),
    payments: z.array(financingPaymentSchema),
    documents: z.array(financingDocumentSchema),
    created_at: z.string(),
  })
  .passthrough();

const financingAgreementsResponseSchema = createApiEnvelopeSchema(
  z.object({ agreements: z.array(financingAgreementSchema) }),
);
const financingAgreementResponseSchema = createApiEnvelopeSchema(financingAgreementSchema);
const financingAvailabilityResponseSchema = createApiEnvelopeSchema(
  z.object({ products: z.array(financingAvailabilityProductSchema) }),
);
const financingPaymentResponseSchema = createApiEnvelopeSchema(financingPaymentSchema);
const financingDocumentResponseSchema = createApiEnvelopeSchema(financingDocumentSchema);
const financingDocumentsResponseSchema = createApiEnvelopeSchema(
  z.object({ documents: z.array(financingDocumentSchema) }),
);

export {
  financingAgreementResponseSchema,
  financingAgreementSchema,
  financingAgreementsResponseSchema,
  financingAvailabilityProductSchema,
  financingAvailabilityResponseSchema,
  financingDocumentResponseSchema,
  financingDocumentsResponseSchema,
  financingDocumentSchema,
  financingItemSchema,
  financingPaymentResponseSchema,
  financingPaymentSchema,
};
