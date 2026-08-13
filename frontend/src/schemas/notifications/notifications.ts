import { z } from "zod";

import { createApiEnvelopeSchema } from "@/schemas/global/api";

const notificationSchema = z.object({
  action_path: z.string(),
  business_id: z.string().uuid().nullable(),
  category: z.enum(["account", "security", "system", "workspace"]),
  context: z.record(z.string(), z.union([z.string(), z.number()])),
  created_at: z.string(),
  expires_at: z.string().nullable(),
  scope: z.enum(["personal", "membership", "workspace", "cross_business"]),
  id: z.string(),
  is_read: z.boolean(),
  read_at: z.string().nullable(),
  template: z.string(),
});
const notificationListSchema = createApiEnvelopeSchema(
  z.object({
    notifications: z.array(notificationSchema),
    unread_count: z.number().int().nonnegative(),
  }),
);
const notificationActionSchema = createApiEnvelopeSchema(
  z.union([
    notificationSchema,
    z.object({ updated_notifications: z.number().int().nonnegative() }),
  ]).nullable(),
);
export { notificationActionSchema, notificationListSchema };
