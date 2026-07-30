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
  getPersonalInformation,
  getProfileOverview,
  removeProfileImage,
  updateProfile,
} from "@/services/profile/profile";
import type {
  PersonalInformation,
  ProfileOverview,
  ProfileUpdateValues,
} from "@/types/profile/profile";

type ProfileContextValue = {
  error: ApiClientError | Error | null;
  overview: ProfileOverview | null;
  personal: PersonalInformation | null;
  refresh: () => Promise<void>;
  removeImage: () => Promise<void>;
  status: "error" | "loading" | "ready";
  save: (values: ProfileUpdateValues) => Promise<void>;
};

const ProfileContext = createContext<ProfileContextValue | null>(null);

function ProfileProvider({ children }: { children: ReactNode }) {
  const {
    accessToken,
    clearSession,
    refreshAccessToken,
    updateUser,
    user,
  } = useIdentitySession();
  const [overview, setOverview] = useState<ProfileOverview | null>(null);
  const [personal, setPersonal] = useState<PersonalInformation | null>(null);
  const [error, setError] = useState<ApiClientError | Error | null>(null);
  const [loading, setLoading] = useState(true);

  const withToken = useCallback(
    async <T,>(operation: (token: string) => Promise<T>) => {
      if (!accessToken) {
        throw new Error("An authenticated session is required.");
      }

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
    setLoading(true);
    setError(null);
    try {
      const [overviewResponse, personalResponse] = await Promise.all([
        withToken((token) => getProfileOverview(token)),
        withToken((token) => getPersonalInformation(token)),
      ]);
      setOverview(overviewResponse.data ?? null);
      setPersonal(personalResponse.data ?? null);
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError
          : new Error("Profile request failed."),
      );
    } finally {
      setLoading(false);
    }
  }, [withToken]);

  useEffect(() => {
    if (!accessToken) return;
    const timeout = window.setTimeout(() => void refresh(), 0);
    return () => window.clearTimeout(timeout);
  }, [accessToken, refresh]);

  const synchronizeIdentity = useCallback(
    (nextPersonal: PersonalInformation) => {
      if (!user) return;
      updateUser({
        ...user,
        email: nextPersonal.email ?? user.email,
        username: nextPersonal.username,
      });
    },
    [updateUser, user],
  );

  const save = useCallback(
    async (values: ProfileUpdateValues) => {
      const response = await withToken((token) =>
        updateProfile(values, token),
      );
      if (!response.data) {
        throw new Error("Profile update response data missing.");
      }
      setPersonal(response.data);
      synchronizeIdentity(response.data);
      const overviewResponse = await withToken((token) =>
        getProfileOverview(token),
      );
      setOverview(overviewResponse.data ?? null);
    },
    [synchronizeIdentity, withToken],
  );

  const removeImage = useCallback(async () => {
    await withToken((token) => removeProfileImage(token));
    const response = await withToken((token) =>
      getPersonalInformation(token),
    );
    setPersonal(response.data ?? null);
  }, [withToken]);

  const value = useMemo(
    () => ({
      error,
      overview,
      personal,
      refresh,
      removeImage,
      save,
      status: loading ? "loading" : error ? "error" : "ready",
    }) satisfies ProfileContextValue,
    [error, loading, overview, personal, refresh, removeImage, save],
  );

  return (
    <ProfileContext.Provider value={value}>
      {children}
    </ProfileContext.Provider>
  );
}

function useProfile() {
  const context = useContext(ProfileContext);
  if (!context) {
    throw new Error("useProfile must be used within ProfileProvider.");
  }
  return context;
}

export { ProfileProvider, useProfile };
