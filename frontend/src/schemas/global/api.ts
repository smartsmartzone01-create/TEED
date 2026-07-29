import { z } from "zod";

import type { ApiFieldErrors } from "@/types/global/api";

const apiFieldIssueSchema = z.object({
  code: z.string().min(1),
  message: z.string(),
});

const apiFieldErrorsSchema: z.ZodType<ApiFieldErrors> =
  z.lazy(() =>
    z.record(
      z.string(),
      z.union([
        z.array(apiFieldIssueSchema),
        apiFieldErrorsSchema,
      ]),
    ),
  );

const apiErrorsSchema = z
  .object({
    code: z.string().min(1),
    fields: apiFieldErrorsSchema.optional(),
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
  apiFieldErrorsSchema,
  apiFieldIssueSchema,
  createApiEnvelopeSchema,
};
