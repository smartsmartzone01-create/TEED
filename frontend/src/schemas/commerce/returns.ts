import { z } from "zod";

import { decimal } from "@/schemas/commerce/shared";
import { saleSchema } from "@/schemas/commerce/sales";
import { createApiEnvelopeSchema } from "@/schemas/global/api";

const returnSchema = z.object({
  id: z.string(),
  sale: z.string(),
  receipt_number: z.string(),
  resolution: z.enum(["refund", "replacement", "credit"]),
  reason: z.string(),
  total: decimal,
  returned_at: z.string(),
});

const returnsWorkspaceResponseSchema = createApiEnvelopeSchema(
  z.object({
    returns: z.array(returnSchema),
    sales: z.array(saleSchema),
  }),
);

const returnResponseSchema = createApiEnvelopeSchema(returnSchema);

export { returnResponseSchema, returnSchema, returnsWorkspaceResponseSchema };
