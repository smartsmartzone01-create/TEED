type WorkspaceBusiness = {
  country_code: string;
  created_at: string;
  id: string;
  name: string;
  status: string;
};

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
};

type WorkspaceOverviewData = {
  business: WorkspaceBusiness;
  membership: WorkspaceMembership;
  state: WorkspaceOverviewState;
};

type CreateBusinessValues = {
  countryCode: "KE" | "TZ" | "UG";
  name: string;
};

type RequestBusinessAccessValues = {
  businessId: string;
  message: string;
};

export type {
  CreateBusinessValues,
  RequestBusinessAccessValues,
  WorkspaceBusiness,
  WorkspaceBusinessListItem,
  WorkspaceInvitation,
  WorkspaceMembership,
  WorkspaceOverviewData,
  WorkspaceOverviewState,
};
