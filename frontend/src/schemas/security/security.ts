import { z } from "zod";
import { createApiEnvelopeSchema } from "@/schemas/global/api";

const eventSchema = z.object({ id: z.string(), event_type: z.string(), outcome: z.enum(["blocked", "failure", "success"]), occurred_at: z.string(), ip_address: z.string(), current_session: z.boolean() });
const overviewSchema = createApiEnvelopeSchema(z.object({ verified_contacts: z.object({ email: z.boolean(), phone: z.boolean() }), active_session_count: z.number(), recovery: z.object({ email_available: z.boolean(), phone_available: z.boolean() }), recent_activity: z.array(eventSchema) }));
const sessionsSchema = createApiEnvelopeSchema(z.object({ sessions: z.array(z.object({ id: z.string(), current: z.boolean(), device_label: z.string(), browser: z.string(), operating_system: z.string(), ip_address: z.string(), created_at: z.string(), last_seen_at: z.string(), expires_at: z.string() })) }));
const activitySchema = createApiEnvelopeSchema(z.object({ events: z.array(eventSchema) }));
const actionSchema = createApiEnvelopeSchema(z.record(z.string(), z.unknown()).nullable());
export { actionSchema, activitySchema, overviewSchema, sessionsSchema };
