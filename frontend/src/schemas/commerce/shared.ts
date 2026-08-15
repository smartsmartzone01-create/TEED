import { z } from "zod";

import { createApiEnvelopeSchema } from "@/schemas/global/api";

const decimal = z.union([z.string(), z.number()]).transform(String);
const genericResponseSchema = createApiEnvelopeSchema(z.unknown());

export { decimal, genericResponseSchema };
