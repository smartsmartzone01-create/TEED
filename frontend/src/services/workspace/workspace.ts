import {
  businessControlRequestEnvelopeSchema,
  businessProfileEnvelopeSchema,
  businessSecurityEnvelopeSchema,
  businessSettingsEnvelopeSchema,
  workspaceAccessRequestEnvelopeSchema,
  workspaceBusinessEnvelopeSchema,
  workspaceBusinessDiscoveryEnvelopeSchema,
  workspaceBusinessListEnvelopeSchema,
  workspaceInvitationListEnvelopeSchema,
  workspaceMembershipEnvelopeSchema,
  workspaceOverviewEnvelopeSchema,
} from "@/schemas/workspace/workspace";
import { requestApi } from "@/services/global/api-client";
import { withCsrfRetry } from "@/services/identity/csrf";
import type {
  CreateBusinessValues,
  RequestBusinessAccessValues,
  BusinessProfileValues,
  BusinessSettingsValues,
} from "@/types/workspace/workspace";

const WORKSPACE_BASE_PATH = "/api/v1/workspaces";

function getBusinesses(accessToken: string, signal?: AbortSignal) {
  return requestApi({
    accessToken,
    path: `${WORKSPACE_BASE_PATH}/businesses/`,
    schema: workspaceBusinessListEnvelopeSchema,
    signal,
  });
}

function getWorkspaceOverview(businessId: string, accessToken: string, signal?: AbortSignal) {
  return requestApi({
    accessToken,
    path: `${WORKSPACE_BASE_PATH}/businesses/${businessId}/overview/`,
    schema: workspaceOverviewEnvelopeSchema,
    signal,
  });
}

function getBusinessProfile(businessId: string, accessToken: string, signal?: AbortSignal) {
  return requestApi({
    accessToken,
    path: `${WORKSPACE_BASE_PATH}/businesses/${businessId}/profile/`,
    schema: businessProfileEnvelopeSchema,
    signal,
  });
}

function updateBusinessProfile(
  businessId: string,
  values: Partial<BusinessProfileValues>,
  accessToken: string,
) {
  const body = new FormData();
  const mapping = {
    address: values.address,
    city: values.city,
    country_code: values.countryCode,
    business_category: values.businessCategory,
    name: values.name,
    operating_model: values.operatingModel,
    primary_brand_color: values.primaryBrandColor,
    public_handle: values.publicHandle,
    region: values.region,
    secondary_brand_color: values.secondaryBrandColor,
    workspace_type: values.workspaceType,
  };
  Object.entries(mapping).forEach(([key, value]) => {
    if (value !== undefined) body.append(key, value);
  });
  const logo = values.logo?.item(0);
  if (logo) body.append("logo", logo);
  return withCsrfRetry((csrfToken) =>
    requestApi({
      accessToken,
      body,
      csrfToken,
      method: "PATCH",
      path: `${WORKSPACE_BASE_PATH}/businesses/${businessId}/profile/`,
      schema: businessProfileEnvelopeSchema,
    }),
  );
}

function getBusinessSettings(businessId: string, accessToken: string, signal?: AbortSignal) {
  return requestApi({
    accessToken,
    path: `${WORKSPACE_BASE_PATH}/businesses/${businessId}/settings/`,
    schema: businessSettingsEnvelopeSchema,
    signal,
  });
}

function updateBusinessSettings(
  businessId: string,
  values: BusinessSettingsValues,
  accessToken: string,
) {
  return withCsrfRetry((csrfToken) =>
    requestApi({
      accessToken,
      body: {
        branding_enabled: values.brandingEnabled,
        date_format: values.dateFormat,
        is_discoverable: values.discoverable,
        language_code: values.languageCode,
        time_format: values.timeFormat,
        timezone: values.timezone,
      },
      csrfToken,
      method: "PATCH",
      path: `${WORKSPACE_BASE_PATH}/businesses/${businessId}/settings/`,
      schema: businessSettingsEnvelopeSchema,
    }),
  );
}

function getBusinessSecurity(businessId: string, accessToken: string, signal?: AbortSignal) {
  return requestApi({
    accessToken,
    path: `${WORKSPACE_BASE_PATH}/businesses/${businessId}/security/`,
    schema: businessSecurityEnvelopeSchema,
    signal,
  });
}

function createBusinessControlRequest(
  businessId: string,
  action: "cancel_deletion" | "delete" | "disable" | "reactivate",
  accessToken: string,
) {
  return withCsrfRetry((csrfToken) =>
    requestApi({
      accessToken,
      body: { action },
      csrfToken,
      method: "POST",
      path: `${WORKSPACE_BASE_PATH}/businesses/${businessId}/control-requests/`,
      schema: businessControlRequestEnvelopeSchema,
    }),
  );
}

function decideBusinessControlRequest(
  businessId: string,
  requestId: string,
  decision: "approve" | "reject",
  accessToken: string,
) {
  return withCsrfRetry((csrfToken) =>
    requestApi({
      accessToken,
      body: { decision },
      csrfToken,
      method: "POST",
      path: `${WORKSPACE_BASE_PATH}/businesses/${businessId}/control-requests/${requestId}/decision/`,
      schema: businessControlRequestEnvelopeSchema,
    }),
  );
}

function discoverBusinesses(query: string, accessToken: string, signal?: AbortSignal) {
  return requestApi({
    accessToken,
    path: `${WORKSPACE_BASE_PATH}/businesses/discover/?q=${encodeURIComponent(query)}`,
    schema: workspaceBusinessDiscoveryEnvelopeSchema,
    signal,
  });
}

function getMyInvitations(accessToken: string, signal?: AbortSignal) {
  return requestApi({
    accessToken,
    path: `${WORKSPACE_BASE_PATH}/invitations/me/`,
    schema: workspaceInvitationListEnvelopeSchema,
    signal,
  });
}

function createBusiness(values: CreateBusinessValues, accessToken: string) {
  return withCsrfRetry((csrfToken) =>
    requestApi({
      accessToken,
      body: {
        country_code: values.countryCode,
        name: values.name,
        workspace_type: values.workspaceType,
      },
      csrfToken,
      method: "POST",
      path: `${WORKSPACE_BASE_PATH}/businesses/`,
      schema: workspaceBusinessEnvelopeSchema,
    }),
  );
}

function requestBusinessAccess(values: RequestBusinessAccessValues, accessToken: string) {
  return withCsrfRetry((csrfToken) =>
    requestApi({
      accessToken,
      body: { business_id: values.businessId, message: values.message },
      csrfToken,
      method: "POST",
      path: `${WORKSPACE_BASE_PATH}/access-requests/`,
      schema: workspaceAccessRequestEnvelopeSchema,
    }),
  );
}

function decideInvitation(invitationId: string, decision: "accept" | "decline", accessToken: string) {
  return withCsrfRetry((csrfToken) =>
    requestApi({
      accessToken,
      body: {},
      csrfToken,
      method: "POST",
      path: `${WORKSPACE_BASE_PATH}/invitations/${invitationId}/${decision}/`,
      schema: workspaceMembershipEnvelopeSchema,
    }),
  );
}

export {
  createBusiness,
  createBusinessControlRequest,
  decideInvitation,
  discoverBusinesses,
  getBusinesses,
  getBusinessProfile,
  getBusinessSecurity,
  getBusinessSettings,
  getMyInvitations,
  getWorkspaceOverview,
  requestBusinessAccess,
  decideBusinessControlRequest,
  updateBusinessProfile,
  updateBusinessSettings,
};
