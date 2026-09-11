"use client";

import { useCallback } from "react";

import { useIdentitySession } from "@/providers/identity/identity-session-provider";
import { ApiClientError } from "@/services/global/api-client";

function useWebsiteRequest() {
  const { accessToken, clearSession, refreshAccessToken } = useIdentitySession();

  return useCallback(
    async <T,>(operation: (token: string) => Promise<T>) => {
      if (!accessToken) throw new Error("An authenticated session is required.");
      try {
        return await operation(accessToken);
      } catch (error) {
        if (!(error instanceof ApiClientError) || error.details.kind !== "unauthenticated") {
          throw error;
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
}

export { useWebsiteRequest };
