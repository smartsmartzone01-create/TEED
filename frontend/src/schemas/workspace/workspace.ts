import { z } from "zod";

import { createApiEnvelopeSchema } from "@/schemas/global/api";

const workspaceBusinessSchema = z.object({
  capabilities: z.array(z.string()),
  country_code: z.string(),
  created_at: z.string(),
  id: z.string().uuid(),
  logo_url: z.string().nullable(),
  name: z.string(),
  public_handle: z.string(),
  primary_brand_color: z.string(),
  secondary_brand_color: z.string(),
  status: z.string(),
  workspace_type: z.enum(["business", "service", "personal_brand"]),
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
    profile_completion_percentage: z.number().int().min(0).max(100),
    profile_missing_fields: z.array(z.string()),
    is_discoverable: z.boolean(),
    branding_enabled: z.boolean(),
    brand_configured: z.boolean(),
  }),
});

const businessProfileSchema = z.object({
  address: z.string(),
  city: z.string(),
  business_category: z.enum([
    "",
    "retail_commerce",
    "food_hospitality",
    "professional_services",
    "health_wellness",
    "education_training",
    "technology_digital",
    "creative_media",
    "manufacturing_agriculture",
    "nonprofit_community",
    "other",
  ]),
  logo_url: z.string().nullable(),
  operating_model: z.enum(["", "physical", "online", "hybrid"]),
  primary_brand_color: z.string(),
  region: z.string(),
  secondary_brand_color: z.string(),
  updated_at: z.string(),
});

const businessProfileCompletionSchema = z.object({
  completed_fields: z.number().int().nonnegative(),
  missing_fields: z.array(z.string()),
  percentage: z.number().int().min(0).max(100),
  total_fields: z.number().int().positive(),
});

const businessProfileEnvelopeSchema = createApiEnvelopeSchema(
  z.object({
    business: workspaceBusinessSchema,
    can_manage: z.boolean(),
    completion: businessProfileCompletionSchema,
    profile: businessProfileSchema,
  }),
);

const businessSettingsSchema = z.object({
  branding_enabled: z.boolean(),
  date_format: z.enum(["DD/MM/YYYY", "MM/DD/YYYY", "YYYY-MM-DD"]),
  is_discoverable: z.boolean(),
  language_code: z.enum(["en", "sw"]),
  time_format: z.enum(["12h", "24h"]),
  timezone: z.enum(["Africa/Dar_es_Salaam", "Africa/Nairobi", "Africa/Kampala", "UTC"]),
  updated_at: z.string(),
});

const businessSettingsEnvelopeSchema = createApiEnvelopeSchema(
  z.object({ can_manage: z.boolean(), settings: businessSettingsSchema }),
);

const workspaceAuditEventSchema = z.object({
  actor_email: z.string().nullable(),
  created_at: z.string(),
  event_type: z.string(),
  id: z.string().uuid(),
  metadata: z.record(z.string(), z.unknown()),
  target_id: z.string().uuid().nullable(),
});

const businessControlRequestSchema = z.object({
  action: z.enum(["disable", "reactivate", "delete", "cancel_deletion"]),
  business_id: z.string().uuid(),
  created_at: z.string(),
  expires_at: z.string(),
  id: z.string().uuid(),
  initiated_by_id: z.string().uuid(),
  status: z.string(),
});

const businessSecurityEnvelopeSchema = createApiEnvelopeSchema(
  z.object({
    business: workspaceBusinessSchema,
    can_control: z.boolean(),
    controllers: z.array(workspaceMembershipSchema),
    membership: workspaceMembershipSchema,
    pending_controls: z.array(businessControlRequestSchema),
    permissions: z.array(z.string()),
    recent_events: z.array(workspaceAuditEventSchema),
  }),
);

const businessControlRequestEnvelopeSchema = createApiEnvelopeSchema(
  businessControlRequestSchema,
);

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
      ["business", "service", "personal_brand"],
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
  businessControlRequestEnvelopeSchema,
  businessProfileEnvelopeSchema,
  businessSecurityEnvelopeSchema,
  businessSettingsEnvelopeSchema,
};
