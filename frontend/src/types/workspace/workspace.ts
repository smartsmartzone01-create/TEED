type WorkspaceBusiness = {
  capabilities: string[];
  country_code: string;
  created_at: string;
  id: string;
  logo_url: string | null;
  name: string;
  public_handle: string;
  primary_brand_color: string;
  secondary_brand_color: string;
  status: string;
  workspace_type: WorkspaceType;
};

type WorkspaceType = "business" | "service" | "personal_brand";

type BusinessCategory =
  | ""
  | "retail_commerce"
  | "food_hospitality"
  | "professional_services"
  | "health_wellness"
  | "education_training"
  | "technology_digital"
  | "creative_media"
  | "manufacturing_agriculture"
  | "nonprofit_community"
  | "other";

type WorkspaceBusinessDiscovery = Pick<
  WorkspaceBusiness,
  "country_code" | "id" | "name" | "public_handle" | "workspace_type"
>;

type WorkspaceMembership = {
  created_at: string;
  email: string;
  id: string;
  permissions: string[];
  role: string;
  status: string;
  user_id: string;
  username: string | null;
};

type WorkspaceBusinessListItem = WorkspaceBusiness & {
  membership: WorkspaceMembership;
};

type WorkspaceInvitation = {
  business_id: string;
  created_at: string;
  email: string;
  expires_at: string;
  id: string;
  role: string;
  status: string;
};

type WorkspaceOverviewState = {
  active_member_count: number;
  pending_access_request_count: number | null;
  pending_action_count: number;
  pending_control_request_count: number | null;
  pending_invitation_count: number | null;
  profile_completion_percentage: number;
  profile_missing_fields: string[];
  is_discoverable: boolean;
  branding_enabled: boolean;
  brand_configured: boolean;
};

type WorkspaceOverviewData = {
  business: WorkspaceBusiness;
  membership: WorkspaceMembership;
  state: WorkspaceOverviewState;
};

type CreateBusinessValues = {
  countryCode: "KE" | "TZ" | "UG";
  name: string;
  workspaceType: WorkspaceType;
};

type RequestBusinessAccessValues = {
  businessId: string;
  message: string;
};

type BusinessProfile = {
  address: string;
  city: string;
  business_category: BusinessCategory;
  logo_url: string | null;
  operating_model: "" | "hybrid" | "online" | "physical";
  primary_brand_color: string;
  region: string;
  secondary_brand_color: string;
  updated_at: string;
};

type BusinessProfileCompletion = {
  completed_fields: number;
  missing_fields: string[];
  percentage: number;
  total_fields: number;
};

type BusinessProfileData = {
  business: WorkspaceBusiness;
  can_manage: boolean;
  completion: BusinessProfileCompletion;
  profile: BusinessProfile;
};

type BusinessProfileValues = {
  address: string;
  city: string;
  countryCode: string;
  businessCategory: BusinessCategory;
  logo?: File;
  name: string;
  operatingModel: "" | "hybrid" | "online" | "physical";
  primaryBrandColor: string;
  publicHandle: string;
  region: string;
  secondaryBrandColor: string;
  workspaceType: WorkspaceType;
};

type BusinessSettings = {
  branding_enabled: boolean;
  date_format: "DD/MM/YYYY" | "MM/DD/YYYY" | "YYYY-MM-DD";
  is_discoverable: boolean;
  language_code: "en" | "sw";
  time_format: "12h" | "24h";
  timezone: "Africa/Dar_es_Salaam" | "Africa/Kampala" | "Africa/Nairobi" | "UTC";
  updated_at: string;
};

type BusinessSettingsData = { can_manage: boolean; settings: BusinessSettings };
type BusinessSettingsValues = {
  brandingEnabled: boolean;
  dateFormat: BusinessSettings["date_format"];
  discoverable: boolean;
  languageCode: BusinessSettings["language_code"];
  timeFormat: BusinessSettings["time_format"];
  timezone: BusinessSettings["timezone"];
};

type WorkspaceAuditEvent = {
  actor_email: string | null;
  created_at: string;
  event_type: string;
  id: string;
  metadata: Record<string, unknown>;
  target_id: string | null;
};

type BusinessControlRequest = {
  action: "cancel_deletion" | "delete" | "disable" | "reactivate";
  business_id: string;
  created_at: string;
  expires_at: string;
  id: string;
  initiated_by_id: string;
  status: string;
};

type BusinessSecurityData = {
  business: WorkspaceBusiness;
  can_control: boolean;
  controllers: WorkspaceMembership[];
  membership: WorkspaceMembership;
  pending_controls: BusinessControlRequest[];
  permissions: string[];
  recent_events: WorkspaceAuditEvent[];
};

export type {
  BusinessCategory,
  CreateBusinessValues,
  BusinessControlRequest,
  BusinessProfile,
  BusinessProfileData,
  BusinessProfileValues,
  BusinessSecurityData,
  BusinessSettings,
  BusinessSettingsData,
  BusinessSettingsValues,
  RequestBusinessAccessValues,
  WorkspaceBusiness,
  WorkspaceBusinessDiscovery,
  WorkspaceBusinessListItem,
  WorkspaceInvitation,
  WorkspaceMembership,
  WorkspaceOverviewData,
  WorkspaceOverviewState,
  WorkspaceType,
  WorkspaceAuditEvent,
};
