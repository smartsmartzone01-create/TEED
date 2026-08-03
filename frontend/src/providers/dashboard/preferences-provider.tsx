"use client";

import { useLocale } from "next-intl";
import { useTheme } from "next-themes";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import { usePathname, useRouter } from "@/i18n/navigation";
import { useIdentitySession } from "@/providers/identity/identity-session-provider";
import { ApiClientError } from "@/services/global/api-client";
import { getPreferences, updatePreferences } from "@/services/dashboard/preferences";
import type { UserPreferences, UserPreferenceUpdate } from "@/types/dashboard/preferences";

type PreferencesContextValue = {
  error: ApiClientError | Error | null;
  preferences: UserPreferences | null;
  refresh: () => Promise<void>;
  status: "error" | "loading" | "ready";
  update: (values: UserPreferenceUpdate) => Promise<UserPreferences>;
};

const PreferencesContext = createContext<PreferencesContextValue | null>(null);

function PreferencesProvider({ children }: { children: ReactNode }) {
  const locale = useLocale();
  const pathname = usePathname();
  const router = useRouter();
  const { setTheme } = useTheme();
  const { accessToken, clearSession, refreshAccessToken, user } = useIdentitySession();
  const accountKey = user?.email ?? "anonymous";
  const [preferences, setPreferences] = useState<UserPreferences | null>(null);
  const [error, setError] = useState<ApiClientError | Error | null>(null);
  const [loading, setLoading] = useState(true);

  const withToken = useCallback(
    async <T,>(operation: (token: string) => Promise<T>) => {
      if (!accessToken) throw new Error("An authenticated session is required.");
      try {
        return await operation(accessToken);
      } catch (requestError) {
        if (!(requestError instanceof ApiClientError) || requestError.details.kind !== "unauthenticated") throw requestError;
        try {
          return await operation(await refreshAccessToken());
        } catch (refreshError) {
          if (refreshError instanceof ApiClientError && refreshError.details.kind === "unauthenticated") clearSession();
          throw refreshError;
        }
      }
    },
    [accessToken, clearSession, refreshAccessToken],
  );

  const applyGlobalPreferences = useCallback(
    (next: UserPreferences) => {
      setTheme(next.appearance);
      document.documentElement.classList.toggle("reduce-motion", next.reduced_motion);
      if (next.language !== locale) router.replace(pathname, { locale: next.language });
    },
    [locale, pathname, router, setTheme],
  );

  const update = useCallback(
    async (values: UserPreferenceUpdate) => {
      if (!preferences) throw new Error("Preferences have not loaded.");
      const previous = preferences;
      const optimistic = { ...previous, ...values };
      setPreferences(optimistic);
      applyGlobalPreferences(optimistic);
      try {
        const response = await withToken((token) => updatePreferences(values, token));
        if (!response.data) throw new Error("Preference update response data missing.");
        setPreferences(response.data);
        applyGlobalPreferences(response.data);
        return response.data;
      } catch (requestError) {
        setPreferences(previous);
        applyGlobalPreferences(previous);
        throw requestError;
      }
    },
    [applyGlobalPreferences, preferences, withToken],
  );

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await withToken((token) => getPreferences(token));
      if (!response.data) throw new Error("Preferences response data missing.");
      let next = response.data;
      const browserTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
      const timezoneKey = `teed.preferences.timezone-initialized:${accountKey}`;
      const timezoneInitialized = window.localStorage.getItem(timezoneKey);
      if (!timezoneInitialized && next.timezone === "UTC" && browserTimezone && browserTimezone !== "UTC") {
        const timezoneResponse = await withToken((token) => updatePreferences({ timezone: browserTimezone }, token));
        if (timezoneResponse.data) next = timezoneResponse.data;
      }
      window.localStorage.setItem(timezoneKey, "true");
      setPreferences(next);
      applyGlobalPreferences(next);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError : new Error("Preferences request failed."));
    } finally {
      setLoading(false);
    }
  }, [accountKey, applyGlobalPreferences, withToken]);

  useEffect(() => {
    if (!accessToken) return;
    const timeout = window.setTimeout(() => void refresh(), 0);
    return () => window.clearTimeout(timeout);
  }, [accessToken, refresh]);

  const value = useMemo(
    () => ({ error, preferences, refresh, status: loading ? "loading" : error ? "error" : "ready", update }) satisfies PreferencesContextValue,
    [error, loading, preferences, refresh, update],
  );

  return <PreferencesContext.Provider value={value}>{children}</PreferencesContext.Provider>;
}

function usePreferences() {
  const context = useContext(PreferencesContext);
  if (!context) throw new Error("usePreferences must be used within PreferencesProvider.");
  return context;
}

function useOptionalPreferences() {
  return useContext(PreferencesContext);
}

export { PreferencesProvider, useOptionalPreferences, usePreferences };
