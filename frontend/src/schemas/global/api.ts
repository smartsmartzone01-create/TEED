import { z } from "zod";

const apiFieldIssueSchema = z.object({
  code: z.string().min(1),
  message: z.string(),
});

const apiErrorsSchema = z
  .object({
    code: z.string().min(1),
    fields: z.record(z.string(), z.unknown()).optional(),
  })
  .passthrough();

function createApiEnvelopeSchema<T extends z.ZodType>(
  dataSchema: T,
) {
  return z
    .object({
      data: dataSchema.nullable().optional(),
      errors: apiErrorsSchema.nullable().optional(),
      message: z.string(),
      meta: z.record(z.string(), z.unknown()).optional(),
      success: z.boolean(),
    })
    .passthrough();
}

export {
  apiErrorsSchema,
  apiFieldIssueSchema,
  createApiEnvelopeSchema,
};
