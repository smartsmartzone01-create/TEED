import { z } from "zod";

import { createApiEnvelopeSchema } from "@/schemas/global/api";
import type {
  WorkspaceSearchData,
  WorkspaceSearchResult,
  WorkspaceSearchSection,
} from "@/types/global/search";

const workspaceSearchResultSchema: z.ZodType<WorkspaceSearchResult> = z.object({
  type: z.enum(["available_product", "stock_receipt"]),
  id: z.string(),
  reference: z.string(),
  title: z.string(),
  subtitle: z.string(),
  status: z.string(),
  module: z.string(),
  metadata: z.record(z.string(), z.unknown()),
});

const workspaceSearchSectionSchema: z.ZodType<WorkspaceSearchSection> = z.object({
  key: z.enum(["available_products", "stock"]),
  module: z.string(),
  results: z.array(workspaceSearchResultSchema),
});

const workspaceSearchDataSchema: z.ZodType<WorkspaceSearchData> = z.object({
  query: z.string(),
  scope: z.enum(["all", "available_products", "stock"]),
  sections: z.array(workspaceSearchSectionSchema),
});

const workspaceSearchResponseSchema = createApiEnvelopeSchema(
  workspaceSearchDataSchema,
);

export {
  workspaceSearchDataSchema,
  workspaceSearchResponseSchema,
  workspaceSearchResultSchema,
  workspaceSearchSectionSchema,
};
