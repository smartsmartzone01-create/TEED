import {
  workspaceAccessRequestEnvelopeSchema,
  workspaceBusinessEnvelopeSchema,
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
      body: { country_code: values.countryCode, name: values.name },
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
  decideInvitation,
  getBusinesses,
  getMyInvitations,
  getWorkspaceOverview,
  requestBusinessAccess,
};
