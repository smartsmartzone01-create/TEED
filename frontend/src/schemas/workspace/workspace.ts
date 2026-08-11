import { z } from "zod";

import { createApiEnvelopeSchema } from "@/schemas/global/api";

const workspaceBusinessSchema = z.object({
  country_code: z.string(),
  created_at: z.string(),
  id: z.string().uuid(),
  name: z.string(),
  public_handle: z.string(),
  status: z.string(),
  workspace_type: z.enum([
    "business",
    "service_provider",
    "creator_brand",
    "personal",
    "other",
  ]),
});

const workspaceBusinessDiscoverySchema = workspaceBusinessSchema.pick({
  country_code: true,
  id: true,
  name: true,
  public_handle: true,
  workspace_type: true,
});

const workspaceMembershipSchema = z.object({
  created_at: z.string(),
  email: z.string(),
  id: z.string().uuid(),
  permissions: z.array(z.string()),
  role: z.string(),
  status: z.string(),
  user_id: z.string().uuid(),
  username: z.string().nullable(),
});

const workspaceBusinessListItemSchema = workspaceBusinessSchema.extend({
  membership: workspaceMembershipSchema,
});

const workspaceInvitationSchema = z.object({
  business_id: z.string().uuid(),
  created_at: z.string(),
  email: z.string(),
  expires_at: z.string(),
  id: z.string().uuid(),
  role: z.string(),
  status: z.string(),
});

const workspaceOverviewSchema = z.object({
  business: workspaceBusinessSchema,
  membership: workspaceMembershipSchema,
  state: z.object({
    active_member_count: z.number().int().nonnegative(),
    pending_access_request_count: z.number().int().nonnegative().nullable(),
    pending_action_count: z.number().int().nonnegative(),
    pending_control_request_count: z.number().int().nonnegative().nullable(),
    pending_invitation_count: z.number().int().nonnegative().nullable(),
  }),
});

const workspaceAccessRequestSchema = z.object({
  business_id: z.string().uuid(),
  created_at: z.string(),
  email: z.string(),
  id: z.string().uuid(),
  message: z.string(),
  requested_role: z.string(),
  status: z.string(),
  user_id: z.string().uuid(),
  username: z.string().nullable(),
});

const workspaceBusinessListEnvelopeSchema = createApiEnvelopeSchema(
  z.object({ businesses: z.array(workspaceBusinessListItemSchema) }),
);
const workspaceBusinessEnvelopeSchema = createApiEnvelopeSchema(workspaceBusinessSchema);
const workspaceBusinessDiscoveryEnvelopeSchema = createApiEnvelopeSchema(
  z.object({ businesses: z.array(workspaceBusinessDiscoverySchema) }),
);
const workspaceOverviewEnvelopeSchema = createApiEnvelopeSchema(workspaceOverviewSchema);
const workspaceInvitationListEnvelopeSchema = createApiEnvelopeSchema(
  z.object({ invitations: z.array(workspaceInvitationSchema) }),
);
const workspaceMembershipEnvelopeSchema = createApiEnvelopeSchema(workspaceMembershipSchema);
const workspaceAccessRequestEnvelopeSchema = createApiEnvelopeSchema(workspaceAccessRequestSchema);

function createBusinessFormSchema(messages: { country: string; name: string; workspaceType: string }) {
  return z.object({
    countryCode: z.enum(["TZ", "KE", "UG"], { message: messages.country }),
    name: z.string().trim().min(2, messages.name).max(120, messages.name),
    workspaceType: z.enum(
      ["business", "service_provider", "creator_brand", "personal", "other"],
      { message: messages.workspaceType },
    ),
  });
}

function createAccessRequestFormSchema(messages: { businessId: string; message: string }) {
  return z.object({
    businessId: z.string().trim().uuid(messages.businessId),
    message: z.string().trim().max(300, messages.message),
  });
}

export {
  createAccessRequestFormSchema,
  createBusinessFormSchema,
  workspaceAccessRequestEnvelopeSchema,
  workspaceBusinessEnvelopeSchema,
  workspaceBusinessDiscoveryEnvelopeSchema,
  workspaceBusinessListEnvelopeSchema,
  workspaceInvitationListEnvelopeSchema,
  workspaceMembershipEnvelopeSchema,
  workspaceOverviewEnvelopeSchema,
};
