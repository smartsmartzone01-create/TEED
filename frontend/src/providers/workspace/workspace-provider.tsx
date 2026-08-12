"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import { useIdentitySession } from "@/providers/identity/identity-session-provider";
import { ApiClientError } from "@/services/global/api-client";
import {
  createBusiness as createBusinessRequest,
  createBusinessControlRequest,
  decideBusinessControlRequest,
  decideInvitation as decideInvitationRequest,
  getBusinesses,
  getMyInvitations,
  getBusinessProfile,
  getBusinessSecurity,
  getBusinessSettings,
  discoverBusinesses as discoverBusinessesRequest,
  requestBusinessAccess as requestBusinessAccessRequest,
  updateBusinessProfile,
  updateBusinessSettings,
  createWorkspaceInvitation,
  cancelWorkspaceInvitation,
  decideWorkspaceAccessRequest,
  getWorkspaceAccessRequests,
  getWorkspaceInvitations,
  getWorkspaceMembers,
  updateWorkspaceMember,
} from "@/services/workspace/workspace";
import type {
  CreateBusinessValues,
  RequestBusinessAccessValues,
  WorkspaceBusiness,
  WorkspaceBusinessDiscovery,
  WorkspaceBusinessListItem,
  WorkspaceInvitation,
  WorkspaceOverviewData,
  BusinessProfileData,
  BusinessProfileValues,
  BusinessSecurityData,
  BusinessSettingsData,
  BusinessSettingsValues,
  WorkspaceAccessRequest,
  WorkspaceMembership,
} from "@/types/workspace/workspace";
import { getWorkspaceOverview } from "@/services/workspace/workspace";

type WorkspaceContextValue = {
  businesses: WorkspaceBusinessListItem[];
  createBusiness: (values: CreateBusinessValues) => Promise<WorkspaceBusiness>;
  decideInvitation: (id: string, decision: "accept" | "decline") => Promise<void>;
  discoverBusinesses: (query: string, signal?: AbortSignal) => Promise<WorkspaceBusinessDiscovery[]>;
  error: ApiClientError | Error | null;
  invitations: WorkspaceInvitation[];
  loadOverview: (businessId: string, signal?: AbortSignal) => Promise<WorkspaceOverviewData>;
  loadProfile: (businessId: string, signal?: AbortSignal) => Promise<BusinessProfileData>;
  loadSecurity: (businessId: string, signal?: AbortSignal) => Promise<BusinessSecurityData>;
  loadSettings: (businessId: string, signal?: AbortSignal) => Promise<BusinessSettingsData>;
  refresh: () => Promise<void>;
  requestAccess: (values: RequestBusinessAccessValues) => Promise<void>;
  saveProfile: (businessId: string, values: Partial<BusinessProfileValues>) => Promise<BusinessProfileData>;
  saveSettings: (businessId: string, values: BusinessSettingsValues) => Promise<BusinessSettingsData>;
  createControl: (businessId: string, action: "cancel_deletion" | "delete" | "disable" | "reactivate") => Promise<void>;
  decideControl: (businessId: string, requestId: string, decision: "approve" | "reject") => Promise<void>;
  status: "error" | "loading" | "ready";
  loadMembers: (businessId: string, signal?: AbortSignal) => Promise<WorkspaceMembership[]>;
  updateMember: (businessId: string, membershipId: string, values: { role?: string; status?: string }) => Promise<WorkspaceMembership>;
  loadInvitations: (businessId: string, signal?: AbortSignal) => Promise<WorkspaceInvitation[]>;
  inviteMember: (businessId: string, values: { email: string; role: string }) => Promise<WorkspaceInvitation>;
  cancelInvitation: (businessId: string, invitationId: string) => Promise<WorkspaceInvitation>;
  loadAccessRequests: (businessId: string, signal?: AbortSignal) => Promise<WorkspaceAccessRequest[]>;
  decideAccessRequest: (businessId: string, requestId: string, values: { decision: "approve" | "reject"; role?: "manager" | "member" }) => Promise<void>;
};

const WorkspaceContext = createContext<WorkspaceContextValue | null>(null);

function WorkspaceProvider({ children }: { children: ReactNode }) {
  const { accessToken, clearSession, refreshAccessToken } = useIdentitySession();
  const [businesses, setBusinesses] = useState<WorkspaceBusinessListItem[]>([]);
  const [invitations, setInvitations] = useState<WorkspaceInvitation[]>([]);
  const [error, setError] = useState<ApiClientError | Error | null>(null);
  const [loading, setLoading] = useState(true);

  const withToken = useCallback(
    async <T,>(operation: (token: string) => Promise<T>) => {
      if (!accessToken) throw new Error("An authenticated session is required.");
      try {
        return await operation(accessToken);
      } catch (requestError) {
        if (
          !(requestError instanceof ApiClientError) ||
          requestError.details.kind !== "unauthenticated"
        ) {
          throw requestError;
        }
        try {
          return await operation(await refreshAccessToken());
        } catch (refreshError) {
          if (
            refreshError instanceof ApiClientError &&
            refreshError.details.kind === "unauthenticated"
          ) {
            clearSession();
          }
          throw refreshError;
        }
      }
    },
    [accessToken, clearSession, refreshAccessToken],
  );

  const refresh = useCallback(async () => {
    if (!accessToken) return;
    setLoading(true);
    setError(null);
    try {
      const [businessResponse, invitationResponse] = await Promise.all([
        withToken((token) => getBusinesses(token)),
        withToken((token) => getMyInvitations(token)),
      ]);
      setBusinesses(businessResponse.data?.businesses ?? []);
      setInvitations(invitationResponse.data?.invitations ?? []);
    } catch (requestError) {
      setError(
        requestError instanceof ApiClientError || requestError instanceof Error
          ? requestError
          : new Error("Workspace request failed."),
      );
    } finally {
      setLoading(false);
    }
  }, [accessToken, withToken]);

  useEffect(() => {
    if (!accessToken) return;
    const initial = window.setTimeout(() => void refresh(), 0);
    const interval = window.setInterval(() => void refresh(), 30_000);
    const onVisibility = () => {
      if (document.visibilityState === "visible") void refresh();
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      window.clearTimeout(initial);
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [accessToken, refresh]);

  const value = useMemo<WorkspaceContextValue>(
    () => ({
      businesses,
      createBusiness: async (values) => {
        const response = await withToken((token) => createBusinessRequest(values, token));
        if (!response.data) throw new Error("Business creation response data missing.");
        await refresh();
        return response.data;
      },
      createControl: async (businessId, action) => {
        await withToken((token) => createBusinessControlRequest(businessId, action, token));
      },
      decideInvitation: async (id, decision) => {
        await withToken((token) => decideInvitationRequest(id, decision, token));
        await refresh();
      },
      decideControl: async (businessId, requestId, decision) => {
        await withToken((token) =>
          decideBusinessControlRequest(businessId, requestId, decision, token),
        );
      },
      discoverBusinesses: async (query, signal) => {
        const response = await withToken((token) =>
          discoverBusinessesRequest(query, token, signal),
        );
        return response.data?.businesses ?? [];
      },
      error,
      invitations,
      loadOverview: async (businessId, signal) => {
        const response = await withToken((token) =>
          getWorkspaceOverview(businessId, token, signal),
        );
        if (!response.data) throw new Error("Workspace overview response data missing.");
        return response.data;
      },
      loadMembers: async (businessId, signal) => {
        const response = await withToken((token) => getWorkspaceMembers(businessId, token, signal));
        return response.data?.members ?? [];
      },
      updateMember: async (businessId, membershipId, values) => {
        const response = await withToken((token) => updateWorkspaceMember(businessId, membershipId, values, token));
        if (!response.data) throw new Error("Membership response data missing.");
        await refresh();
        return response.data;
      },
      loadInvitations: async (businessId, signal) => {
        const response = await withToken((token) => getWorkspaceInvitations(businessId, token, signal));
        return response.data?.invitations ?? [];
      },
      inviteMember: async (businessId, values) => {
        const response = await withToken((token) => createWorkspaceInvitation(businessId, values, token));
        if (!response.data) throw new Error("Invitation response data missing.");
        return response.data;
      },
      cancelInvitation: async (businessId, invitationId) => {
        const response = await withToken((token) => cancelWorkspaceInvitation(businessId, invitationId, token));
        if (!response.data) throw new Error("Invitation response data missing.");
        return response.data;
      },
      loadAccessRequests: async (businessId, signal) => {
        const response = await withToken((token) => getWorkspaceAccessRequests(businessId, token, signal));
        return response.data?.access_requests ?? [];
      },
      decideAccessRequest: async (businessId, requestId, values) => {
        await withToken((token) => decideWorkspaceAccessRequest(businessId, requestId, values, token));
        await refresh();
      },
      loadProfile: async (businessId, signal) => {
        const response = await withToken((token) =>
          getBusinessProfile(businessId, token, signal),
        );
        if (!response.data) throw new Error("Business profile response data missing.");
        return response.data;
      },
      loadSecurity: async (businessId, signal) => {
        const response = await withToken((token) =>
          getBusinessSecurity(businessId, token, signal),
        );
        if (!response.data) throw new Error("Business security response data missing.");
        return response.data;
      },
      loadSettings: async (businessId, signal) => {
        const response = await withToken((token) =>
          getBusinessSettings(businessId, token, signal),
        );
        if (!response.data) throw new Error("Business settings response data missing.");
        return response.data;
      },
      refresh,
      requestAccess: async (values) => {
        await withToken((token) => requestBusinessAccessRequest(values, token));
        await refresh();
      },
      saveProfile: async (businessId, values) => {
        const response = await withToken((token) =>
          updateBusinessProfile(businessId, values, token),
        );
        if (!response.data) throw new Error("Business profile response data missing.");
        await refresh();
        return response.data;
      },
      saveSettings: async (businessId, values) => {
        const response = await withToken((token) =>
          updateBusinessSettings(businessId, values, token),
        );
        if (!response.data) throw new Error("Business settings response data missing.");
        return response.data;
      },
      status: loading ? "loading" : error ? "error" : "ready",
    }),
    [businesses, error, invitations, loading, refresh, withToken],
  );

  return <WorkspaceContext.Provider value={value}>{children}</WorkspaceContext.Provider>;
}

function useWorkspace() {
  const context = useContext(WorkspaceContext);
  if (!context) throw new Error("useWorkspace must be used within WorkspaceProvider.");
  return context;
}

export { WorkspaceProvider, useWorkspace };
