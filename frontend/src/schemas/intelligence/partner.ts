import { z } from "zod";

import { createApiEnvelopeSchema } from "@/schemas/global/api";

const kuzaAIPartnerDataSchema = z.object({
  assistant: z.object({
    id: z.string(),
    name: z.string(),
  }),
  reply: z.string(),
  locale: z.enum(["en", "sw"]),
  usage: z.record(z.string(), z.number()).default({}),
});

const kuzaAIPartnerResponseSchema = createApiEnvelopeSchema(
  kuzaAIPartnerDataSchema,
);

export { kuzaAIPartnerResponseSchema };
