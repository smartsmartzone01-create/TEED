import { z } from "zod";

import { createApiEnvelopeSchema } from "@/schemas/global/api";

const preferencesSchema = z.object({
  language: z.enum(["en", "sw"]),
  appearance: z.enum(["system", "light", "dark"]),
  timezone: z.string().min(1),
  date_format: z.enum(["DD/MM/YYYY", "MM/DD/YYYY", "YYYY-MM-DD"]),
  time_format: z.enum(["12h", "24h"]),
  reduced_motion: z.boolean(),
});

const preferencesEnvelopeSchema = createApiEnvelopeSchema(preferencesSchema);

export { preferencesEnvelopeSchema, preferencesSchema };
